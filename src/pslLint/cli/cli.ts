#!/usr/bin/env node
import * as commander from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
import { getDiagnostics } from '../activate';
import * as api from '../api';
import { setConfig } from '../config';

interface CodeClimateIssue {
	categories?: string[];
	check_name: string;
	description: string;
	location: CodeClimateLocation;
	fingerprint: string;
}

interface CodeClimateLocation {
	path: string;
	lines: CodeClimateLines;
}

interface CodeClimateLines {
	begin: number;
	end: number;
}

interface StoredDiagnostic {
	diagnostic: api.Diagnostic;
	filePath: string;
}

const diagnosticStore: Map<string, StoredDiagnostic[]> = new Map();
let useConfig: boolean;

function getMessage(storedDiagnostic: StoredDiagnostic) {
	const { diagnostic, filePath } = storedDiagnostic;
	const range = `${diagnostic.range.start.line + 1},${diagnostic.range.start.character + 1}`;
	const severity = `${api.DiagnosticSeverity[diagnostic.severity].substr(0, 4).toUpperCase()}`;
	return `${filePath}(${range}) [${severity}][${diagnostic.source}][${diagnostic.ruleName}] ${diagnostic.message}`;
}

async function readFile(filename: string): Promise<number> {
	let errorCount = 0;
	if (
		path.extname(filename) !== '.PROC'
		&& path.extname(filename) !== '.BATCH'
		&& path.extname(filename).toUpperCase() !== '.PSL'
	) {
		return errorCount;
	}
	const filePath = path.relative(process.cwd(), filename);
	const fileBuffer = await fs.readFile(filePath);
	const textDocument = fileBuffer.toString();
	const parsedDocument = prepareDocument(textDocument, filePath);

	const diagnostics = getDiagnostics(parsedDocument, useConfig);

	diagnostics.forEach(diagnostic => {
		if (diagnostic.severity === api.DiagnosticSeverity.Warning || diagnostic.severity === api.DiagnosticSeverity.Error) {
			errorCount += 1;
		}
		const mapDiagnostics = diagnosticStore.get(diagnostic.source);
		if (!mapDiagnostics) diagnosticStore.set(diagnostic.source, [{ diagnostic, filePath }]);
		else mapDiagnostics.push({ diagnostic, filePath });
	});

	return errorCount;
}

function prepareDocument(textDocument: string, filename: string): api.PslDocument {
	const parsedDocument = api.parseText(textDocument);
	return new api.PslDocument(parsedDocument, textDocument, filename);
}

export async function readPath(fileString: string) {
	const files = fileString.split(';').filter(x => x);
	const promises: Array<Promise<any>> = [];
	let exitCode = 0;
	for (const filePath of files) {
		const absolutePath = path.resolve(filePath);
		if (!absolutePath) continue;
		const stat = await fs.lstat(absolutePath);
		if (stat.isDirectory()) {
			const fileNames = await fs.readdir(absolutePath);
			for (const fileName of fileNames) {
				const absolutePathInDir = path.resolve(path.join(absolutePath, fileName));
				await readPath(absolutePathInDir);
			}
		}
		else if (stat.isFile()) {
			const promise = readFile(absolutePath).then(errorCount => {
				exitCode += errorCount;
			}).catch((e: Error) => {
				if (e.message) console.error(absolutePath, e.message, e.stack);
				else console.error(absolutePath, e);
			});
			promises.push(promise);
		}
	}
	await Promise.all(promises);
	return exitCode;
}

async function processConfig(): Promise<void> {
	const configPath = path.join(process.cwd(), 'psl-lint.json');
	await fs.lstat(configPath).then(async () => {
		await setConfig(configPath);
		useConfig = true;
	}).catch(() => {
		useConfig = false;
	});
}

async function outputResults(reportFileName?: string) {
	if (reportFileName) {
		await generateCodeQualityReport(reportFileName);
		console.log('Finished report.');
	}
	else {
		printOutputToConsole();
		console.log('Finished lint.');
	}
}

function printOutputToConsole() {
	for (const source of diagnosticStore.keys()) {
		const diagnostics = diagnosticStore.get(source);
		const word = diagnosticStore.get(source).length === 1 ? 'diagnostic' : 'diagnostics';
		console.log(`[${source}] ${diagnostics.length} ${word}:`);
		diagnostics.forEach(diagnostic => {
			console.log(getMessage(diagnostic));
		});
	}
}

async function generateCodeQualityReport(reportFileName: string) {
	const counts: {
		[ruleName: string]: number;
	} = {};
	const issues: CodeClimateIssue[] = [];
	for (const ruleDiagnostics of diagnosticStore.values()) {
		for (const storedDiagnostic of ruleDiagnostics) {
			const { diagnostic, filePath } = storedDiagnostic;
			const count = counts[diagnostic.ruleName];
			if (!count) {
				counts[diagnostic.ruleName] = 1;
			}
			else {
				counts[diagnostic.ruleName] = counts[diagnostic.ruleName] + 1;
			}
			if (diagnostic.ruleName === 'MemberCamelCase') continue;
			const issue: CodeClimateIssue = {
				check_name: diagnostic.ruleName,
				description: `[${diagnostic.ruleName}] ${diagnostic.message.trim().replace(/\.$/, '')}`,
				fingerprint: hashObject(diagnostic),
				location: {
					lines: {
						begin: diagnostic.range.start.line + 1,
						end: diagnostic.range.end.line + 1,
					},
					path: filePath,
				},
			};
			issues.push(issue);
		}
	}
	console.log('Diagnostics found in repository:');
	(console as any).table(counts);
	await fs.writeFile(reportFileName, JSON.stringify(issues));
}

function hashObject(object: any) {
	const hash = crypto.createHash('md5')
		.update(JSON.stringify(object, (key, value) => {
			if (key[0] === '_') return undefined; // remove api stuff
			else if (typeof value === 'function') { // consider functions
				return value.toString();
			}
			else return value;
		}))
		.digest('hex');
	return hash;
}

function getCliArgs() {
	commander
		.name('psl-lint')
		.usage('<fileString>')
		.option('-o, --output <output>', 'Name of output file')
		.description('fileString    a ; delimited string of file paths')
		.parse(process.argv);
	return { fileString: commander.args[0], reportFileName: commander.output };
}

(async function main() {
	if (require.main !== module) {
		return;
	}
	const { fileString, reportFileName } = getCliArgs();
	if (fileString) {

		await processConfig();

		if (reportFileName) console.log('Starting report.');
		else console.log('Starting lint.');

		const exitCode = await readPath(fileString);
		await outputResults(reportFileName);
		process.exit(exitCode);
	}
	else {
		console.log('Nothing to lint.');
	}
})();

// psl-lint $(git diff master...${CI_BUILD_REF_NAME} --name-only | tr "\n" ";")
