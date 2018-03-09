import { PSL_MODE, BATCH_MODE, TRIG_MODE } from '../extension';
import { getTokens, Type } from '../parser/tokenizer';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let todoDiagnostics = vscode.languages.createDiagnosticCollection('psl-todo');
	context.subscriptions.push(todoDiagnostics);
	if (vscode.window.activeTextEditor) {
		todoHandler(vscode.window.activeTextEditor.document, todoDiagnostics)
	}
	vscode.workspace.onDidOpenTextDocument((textDocument) => todoHandler(textDocument, todoDiagnostics))
	vscode.workspace.onDidChangeTextDocument((e) => todoHandler(e.document, todoDiagnostics))
}

function isPSL(textDocument: vscode.TextDocument) {
	return vscode.languages.match(PSL_MODE, textDocument) || vscode.languages.match(BATCH_MODE, textDocument) || vscode.languages.match(TRIG_MODE, textDocument);
}

function todoHandler(textDocument: vscode.TextDocument, todoDiagnostics: vscode.DiagnosticCollection) {
	if (!isPSL(textDocument)) return;
	let todos = getTodos(textDocument.getText());

	let diagnostics = todos.map(todo => {
		let diagnostic = new vscode.Diagnostic(todo.range, todo.message, vscode.DiagnosticSeverity.Information)
		diagnostic.source = 'TODO';
		return diagnostic;
	})
	todoDiagnostics.set(vscode.Uri.file(textDocument.fileName), diagnostics);
	vscode.workspace.onDidCloseTextDocument(textDocument => todoDiagnostics.delete(textDocument.uri));
}

interface Todo {
	range: vscode.Range
	message: string
}

function getTodos(documentText: string) {
	let tokens = getTokens(documentText);
	let todos: Todo[] = [];
	for (let token of tokens) {
		let startLine = token.position.line;
		let startChar = token.position.character;
		if (token.type === Type.BlockComment || token.type === Type.LineComment) {
			todos = todos.concat(getTodosFromComment(token.value, startLine, startChar));
		}
	}
	return todos;
}

function getTodosFromComment(text: string, startLine: number, startChar: number): Todo[] {
	let todos = [];
	let todo: Todo;
	let tokens = getTokens(text);
	let currentLine: number;
	let currentChar: number;

	let finalize = (newTodo: Todo) => {
		newTodo.range = newTodo.range.with({ end: new vscode.Position(currentLine, newTodo.range.end.character + newTodo.message.trimRight().length) })
		newTodo.message = todo.message.trim().replace(/^:/gm, '').trim();
		if (!newTodo.message) newTodo.message = `TODO on line ${todo.range.start.line + 1}`;
		todos.push(newTodo);
		todo = undefined;
	}

	for (let token of tokens) {
		currentLine = startLine + token.position.line;
		currentChar = startLine === currentLine ? token.position.character + startChar : token.position.character;

		if (token.type === Type.BlockComment || token.type === Type.LineComment) {
			todos = todos.concat(getTodosFromComment(token.value, currentLine, currentChar));
		}
		else if (token.value === 'TODO' && !todo) {
			let range = new vscode.Range(currentLine, currentChar, currentLine, currentChar + 4);
			let message = '';
			todo = { range, message };
		}
		else if (todo) {
			if (token.type === Type.NewLine) finalize(todo);
			else todo.message += token.value;
		}
	}
	if (todo) finalize(todo);
	return todos;
}