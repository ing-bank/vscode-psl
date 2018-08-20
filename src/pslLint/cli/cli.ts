#!/usr/bin/env node
import * as fs from 'fs-extra';
import * as commander from 'commander';
import * as process from 'process';
import * as path from 'path';
import { getDiagnostics } from '../activate'
import * as api from '../api';
import { setConfig } from '../config';

async function readFile(filename: string, map: Map<string, string[]>): Promise<number> {
	let errorCount = 0;
	if (path.extname(filename) !== '.PROC' && path.extname(filename) !== '.BATCH' && path.extname(filename).toUpperCase() !== '.PSL')
		return errorCount;
	let filePath = path.join(process.cwd(), filename);
	let fileBuffer = await fs.readFile(filePath)
	let textDocument = fileBuffer.toString();
	let parsedDocument = prepareDocument(textDocument, filePath);
	let configPath = path.join(process.cwd(), 'psl-lint.json');

	let useConfig;
	await fs.lstat(configPath).then(async () => {
		await setConfig(configPath);
		useConfig = true;
	}).catch(() => {
		useConfig = false;
	});

	let diagnostics = getDiagnostics(parsedDocument, useConfig);
	diagnostics.forEach(d => {
		let range = `${d.range.start.line + 1},${d.range.start.character + 1}`;
		let severity = `${api.DiagnosticSeverity[d.severity].substr(0, 4).toUpperCase()}`
		if (d.severity === api.DiagnosticSeverity.Warning || d.severity === api.DiagnosticSeverity.Error) errorCount += 1;
		let message = `${filename}(${range}) [${severity}][${d.source}] ${d.message}`
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

export async function cli(fileString: string, map: Map<string, string[]>) {
	let files = fileString.split(';');
	let promises: Promise<any>[] = [];
	let exitCode = 0;
	for (let index = 0; index < files.length; index++) {
		const fsPath = files[index];
		if (!fsPath) continue;
		let stat = await fs.lstat(fsPath);
		if (stat.isDirectory()) {
			let files = await fs.readdir(fsPath);
			files.forEach(file => {
				cli(path.join(fsPath, file), map);
			})
		}
		else if (stat.isFile()) {
			let promise = readFile(fsPath, map).then(errorCount => {
				exitCode += errorCount;
			}).catch(e => {
				if (e.message) console.error(fsPath, e.message);
				else console.error(fsPath, e);
			})
			promises.push(promise);
		}
	}
	await Promise.all(promises);
	return exitCode;
}

if (require.main === module) {
	commander
		.name('psl-lint')
		.usage('<filestring>')
		.description('filestring    a ; delimited string of file paths')
		.parse(process.argv);

	if (commander.args[0]) {
		console.log('Starting lint.');
		let map = new Map<string, string[]>();
		cli(commander.args[0], map).then(exitCode => {
			for (const source of map.keys()) {
				let diags = map.get(source);
				let word = map.get(source).length === 1 ? 'diagnostic' : 'diagnostics';
				console.log(`[${source}] ${diags.length} ${word}:`);
				diags.forEach(message => {
					console.log(message);
				})
			}

			console.log('Finished lint.');
			process.exit(exitCode);
		});
	}
	else {
		console.log('Nothing to lint.');
	}
}

// psl-lint $(git diff master...${CI_BUILD_REF_NAME} --name-only | tr "\n" ";")
