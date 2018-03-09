import { PSL_MODE, BATCH_MODE, TRIG_MODE } from '../extension';
import { getTokens, Type } from '../parser/tokenizer';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let todoDiagnostics = vscode.languages.createDiagnosticCollection('psl-todo');
	context.subscriptions.push(todoDiagnostics);
	if (vscode.window.activeTextEditor) {
		parseForTodo(vscode.window.activeTextEditor.document, todoDiagnostics)
	}
	vscode.workspace.onDidOpenTextDocument((textDocument) => parseForTodo(textDocument, todoDiagnostics))
	vscode.workspace.onDidChangeTextDocument((e) => parseForTodo(e.document, todoDiagnostics))


}


interface Todo {
	range: vscode.Range
	message: string
}

async function parseForTodo(textDocument: vscode.TextDocument, todoDiagnostics: vscode.DiagnosticCollection) {
	if (!isPSL(textDocument)) return;
	let tokens = getTokens(textDocument.getText());
	let todos: Todo[] = [];

	for (let token of tokens) {
		let startLine = token.position.line;
		let startChar = token.position.character;
		if (token.type === Type.BlockComment || token.type === Type.LineComment) {
			todos = todos.concat(getTodos(token.value, startLine, startChar, textDocument));
		}
	}

	let diagnostics = todos.map(todo => {
		let message = todo.message.trim().replace(/^:/gm, '').trim();
		if (!message) message = `TODO on line ${todo.range.start.line + 1}`;
		let diagnostic = new vscode.Diagnostic(todo.range, message, vscode.DiagnosticSeverity.Information)
		diagnostic.source = 'TODO';
		return diagnostic;
	})
	todoDiagnostics.set(vscode.Uri.file(textDocument.fileName), diagnostics);
	vscode.workspace.onDidCloseTextDocument(textDocument => todoDiagnostics.delete(textDocument.uri));
}

function isPSL(textDocument: vscode.TextDocument) {
	return vscode.languages.match(PSL_MODE, textDocument) || vscode.languages.match(BATCH_MODE, textDocument) || vscode.languages.match(TRIG_MODE, textDocument);
}

function getTodos(text: string, startLine: number, startChar: number, textDocument: vscode.TextDocument): Todo[] {
	let todos = [];
	let tokens = getTokens(text);
	let range: vscode.Range = undefined;
	let message = '';
	for (let token of tokens) {
		let currentLine = startLine + token.position.line;
		let currentChar = startLine === currentLine ? token.position.character + startChar : token.position.character;
		if (token.type === Type.BlockComment || token.type === Type.LineComment) {
			todos = todos.concat(getTodos(token.value, currentLine, currentChar, textDocument));
		}
		if (token.value === 'TODO') {
			let trimmedLine = textDocument.lineAt(currentLine).text.trimRight().replace(/\*\/$/g, '');
			while (trimmedLine.match(/(\*\/|\s+)$/g)) {
				trimmedLine = trimmedLine.trimRight().replace(/\*\/$/g, '');
			}
			range = new vscode.Range(currentLine, currentChar, currentLine, trimmedLine.length);
		}
		else if (range) {
			if (token.type === Type.NewLine) {
				todos.push({ range, message });
				range = undefined;
				message = '';
				continue;
			}
			message += token.value;
		}
	}
	if (range) todos.push({ range, message })
	return todos;
}