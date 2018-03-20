#!/usr/bin/env node
import * as fs from 'fs-extra';
import * as commander from 'commander';
import * as path from 'path';
import { getDiagnostics } from '../activate'
import { DiagnosticSeverity, parseText } from '../api';

const version = require(path.resolve('package.json')).version;

async function readFile(filename: string): Promise<number> {
	if (path.extname(filename) !== '.PROC' && path.extname(filename) !== '.BATCH' && path.extname(filename).toUpperCase() !== '.PSL') return;
	let value = await fs.readFile(filename)
	let textDocument = value.toString();
	let document = parseText(textDocument);
	let diagnostics = getDiagnostics(document, textDocument);
	let exitCode = 0;
	diagnostics.forEach(d => {
		let range = `${d.range.start.line + 1},${d.range.start.character + 1}`;
		let severity = `${DiagnosticSeverity[d.severity].substr(0, 4).toUpperCase()}`
		if (d.severity === DiagnosticSeverity.Warning || d.severity === DiagnosticSeverity.Error) exitCode = 1;
		console.log(`${path.resolve(filename)}(${range}) [${severity}][${d.source}] ${d.message}`)
	})
	return exitCode;
}


async function cli(fileString: string) {
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
				cli(path.join(fsPath, file));
			})
		}
		else if (stat.isFile()) {
			let promise = readFile(fsPath).then(code => {
				if (code !== 0) exitCode = code;
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
	commander.version(version, '-v, --version')
	.name('psl-lint')
	.usage('<filestring>')
	.description('filestring    a ; delimited string of file paths')
	.parse(process.argv);
	
	if (commander.args[0]) {
		console.log('Starting lint.')
		cli(commander.args[0]).then(exitCode => {
			console.log('Finished lint.')
			process.exit(exitCode)
		});
	}
	else {
		console.log('Nothing to lint.')
	}
}

// psl-lint $(git diff master...${CI_BUILD_REF_NAME} --name-only | tr "\n" ";")