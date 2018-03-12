import { Document, parseText, Diagnostic, Rule, DiagnosticSeverity } from './api';
import { ParametersOnNewLine } from './parameters';
import { TodoInfo } from './todos';
import * as fs from 'fs-extra';
import * as path from 'path';

function registerRules(rules: Rule[]) {
	rules.push(new ParametersOnNewLine());

	rules.push(new TodoInfo());
}

export function getDiagnostics(parsedDocument: Document, textDocument: string) {
	let rules: Rule[] = [];
	let diagnostics: Diagnostic[] = []
	registerRules(rules);
	rules.forEach(rule => {
		diagnostics = diagnostics.concat(rule.report(parsedDocument, textDocument));
	})
	return diagnostics;
}


async function readFile(filename: string) {
	if (path.extname(filename) !== '.PROC' && path.extname(filename).toUpperCase() !== '.PSL') return;
	let value = await fs.readFile(filename)
	let textDocument = value.toString();
	let document = parseText(textDocument);
	let diagnostics = getDiagnostics(document, textDocument);

	diagnostics.forEach(d => {
		let range = `${d.range.start.line + 1},${d.range.start.character + 1}`;
		let severity = `${DiagnosticSeverity[d.severity].substr(0, 4).toUpperCase()}`
		console.log(`${path.resolve(filename)}(${range}) [${severity}][${d.source}] ${d.message}`)
	})
}

async function cli(fileString: string) {
	let files = fileString.split(';');
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
			readFile(fsPath).catch(e => {
				if (e.message) console.error(fsPath, e.message);
				else console.error(fsPath, e);
			})
		}
	}
}

if (require.main === module) {
	if (!process.argv[2]) {
		console.error('Please enter a filename.');
		process.exit(1);
	}
	cli(process.argv[2]);
}