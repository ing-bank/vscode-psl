#!/usr/bin/env node
import * as fs from 'fs-extra';
import * as commander from 'commander';
import * as process from 'process';
import * as path from 'path';
import { getDiagnostics } from '../activate'
import * as api from '../api';
import { setConfig } from '../config';
import * as crypto from 'crypto';

function hashObject(object) {
	var hash = crypto.createHash('md5')
		.update(JSON.stringify(object, function (k, v) {
			if (k[0] === "_") return undefined; // remove api stuff
			else if (typeof v === "function") // consider functions
				return v.toString();
			else return v;
		}))
		.digest('hex');
	return hash;
}

interface CodeClimateIssue {
	categories?: string[]
	check_name: string
	description: string
	location: CodeClimateLocation
	fingerprint: string
}

interface CodeClimateLocation {
	path: string
	lines: CodeClimateLines
}

interface CodeClimateLines {
	begin: number
	end: number
}

const allDiagnostics: api.Diagnostic[] = []

async function readFile(filename: string, map: Map<string, string[]>, useConfig: boolean): Promise<number> {
	let errorCount = 0;
	if (path.extname(filename) !== '.PROC' && path.extname(filename) !== '.BATCH' && path.extname(filename).toUpperCase() !== '.PSL')
		return errorCount;
	let filePath = path.relative(process.cwd(), filename);
	let fileBuffer = await fs.readFile(filePath);
	let textDocument = fileBuffer.toString();
	let parsedDocument = prepareDocument(textDocument, filePath);

	let diagnostics = getDiagnostics(parsedDocument, useConfig);

	diagnostics.forEach(d => {
		d.code = filePath;
		allDiagnostics.push(d);
		let range = `${d.range.start.line + 1},${d.range.start.character + 1}`;
		let severity = `${api.DiagnosticSeverity[d.severity].substr(0, 4).toUpperCase()}`
		if (d.severity === api.DiagnosticSeverity.Warning || d.severity === api.DiagnosticSeverity.Error) errorCount += 1;
		let message = `${filePath}(${range}) [${severity}][${d.source}][${d.ruleName}] ${d.message}`
		let mapDiags = map.get(d.source);
		if (!mapDiags) map.set(d.source, [message])
		else map.set(d.source, mapDiags.concat([message]));
	})
	return errorCount;
}

function prepareDocument(textDocument: string, filename: string): api.PslDocument {
	let parsedDocument = api.parseText(textDocument);
	return new api.PslDocument(parsedDocument, textDocument, filename);
}

export async function cli(fileString: string, map: Map<string, string[]>, useConfig: boolean) {
	let files = fileString.split(';').filter(x => x);
	let promises: Promise<any>[] = [];
	let exitCode = 0;
	for (let index = 0; index < files.length; index++) {
		const absolutePath = path.resolve(files[index]);
		if (!absolutePath) continue;
		let stat = await fs.lstat(absolutePath);
		if (stat.isDirectory()) {
			let fileNames = await fs.readdir(absolutePath);
			for (const fileName of fileNames) {
				let absolutePathInDir = path.resolve(path.join(absolutePath, fileName));
				await cli(absolutePathInDir, map, useConfig);
			}
		}
		else if (stat.isFile()) {
			let promise = readFile(absolutePath, map, useConfig).then(errorCount => {
				exitCode += errorCount;
			}).catch(e => {
				if (e.message) console.error(absolutePath, e.message);
				else console.error(absolutePath, e);
			})
			promises.push(promise);
		}
	}
	await Promise.all(promises);
	return exitCode;
}

async function main() {
	commander
		.name('psl-lint')
		.usage('<filestring>')
		.option('-o, --output <output>', 'Name of output file')
		.description('filestring    a ; delimited string of file paths')
		.parse(process.argv);

	if (commander.args[0]) {
		let map = new Map<string, string[]>();
		let configPath = path.join(process.cwd(), 'psl-lint.json');
		let useConfig = false;
		await fs.lstat(configPath).then(async () => {
			await setConfig(configPath);
			useConfig = true;
		}).catch(() => {
			useConfig = false;
		});
		if (commander.output) console.log('Starting report.');
		else console.log('Starting lint.');
		cli(commander.args[0], map, useConfig).then(async exitCode => {
			let counts: { [ruleName: string]: number } = {};
			if (commander.output) {
				let issues: CodeClimateIssue[] = allDiagnostics.filter(d => {
					let count = counts[d.ruleName]
					if (count === undefined) counts[d.ruleName] = 1;
					else counts[d.ruleName] = counts[d.ruleName] + 1;
					return d.ruleName !== 'MemberCamelCase'
				}).map(diagnostic => {
					let issue: CodeClimateIssue = {
						check_name: diagnostic.ruleName,
						description: `[${diagnostic.ruleName}] ${diagnostic.message.trim().replace(/\.$/, '')}`,
						location: {
							path: diagnostic.code as string,
							lines: {
								begin: diagnostic.range.start.line + 1,
								end: diagnostic.range.end.line + 1
							}
						},
						fingerprint: hashObject(diagnostic)
					}
					return issue;
				})
				console.log('Diagnostics found in repository:')
				for (const ruleName in counts) {
					if (counts.hasOwnProperty(ruleName)) {
						const count = counts[ruleName];
						console.log(`${ruleName}:	${count}`);
					}
				}
				await fs.writeFile(commander.output, JSON.stringify(issues));
				console.log('Finished report.')
			}
			else {
				for (const source of map.keys()) {
					let diags = map.get(source);
					let word = map.get(source).length === 1 ? 'diagnostic' : 'diagnostics';
					console.log(`[${source}] ${diags.length} ${word}:`);
					diags.forEach(message => {
						console.log(message);
					})
				}
				console.log('Finished lint.');
			}

			process.exit(exitCode);
		});
	}
	else {
		console.log('Nothing to lint.');
	}
}

if (require.main === module) {
	main();
}

// psl-lint $(git diff master...${CI_BUILD_REF_NAME} --name-only | tr "\n" ";")
