import * as vscode from 'vscode';

import { PSL_MODE, BATCH_MODE, TRIG_MODE, DATA_MODE } from '../extension';

import { PSLDocumentSymbolProvider } from './pslDocument';
import { DataHoverProvider, DataDocumentHighlightProvider } from './dataItem';
import { PSLCompletionItemProvider } from './pslSuggest';
import { getTokens, Type } from '../parser/tokenizer';

export async function activate(context: vscode.ExtensionContext) {

	// Document Symbol Outline
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			PSL_MODE, new PSLDocumentSymbolProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			BATCH_MODE, new PSLDocumentSymbolProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			TRIG_MODE, new PSLDocumentSymbolProvider()
		)
	);

	// Completition Items
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			PSL_MODE, new PSLCompletionItemProvider(), '.'
		)
	);
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			BATCH_MODE, new PSLCompletionItemProvider(), '.'
		)
	);
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			TRIG_MODE, new PSLCompletionItemProvider(), '.'
		)
	);

	// Hovers
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			DATA_MODE, new DataHoverProvider()
		)
	);

	// Document Highlights
	context.subscriptions.push(
		vscode.languages.registerDocumentHighlightProvider(
			DATA_MODE, new DataDocumentHighlightProvider()
		)
	);


	let todoDiagnostics = vscode.languages.createDiagnosticCollection('psl-todo');
	context.subscriptions.push(todoDiagnostics);
	if (vscode.window.activeTextEditor) {
		parseForTodo(vscode.window.activeTextEditor.document, todoDiagnostics)
	}
	vscode.workspace.onDidOpenTextDocument((textDocument) => parseForTodo(textDocument, todoDiagnostics))
	vscode.workspace.onDidChangeTextDocument((e) => parseForTodo(e.document, todoDiagnostics))


	// Language Configuration
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\'\'\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration('psl', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileBatch', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileTrigger', { wordPattern });
}

interface Todo {
	range: vscode.Range
	text: string
}

async function parseForTodo(textDocument: vscode.TextDocument, todoDiagnostics: vscode.DiagnosticCollection) {
	if (!vscode.languages.match(PSL_MODE, textDocument)) return;
	let tokens = getTokens(textDocument.getText());
	let diagnostics = [];

	for (let token of tokens) {
		let todos: Todo[] = [];
		let startLine = token.position.line;
		let startChar = token.position.character;
		if (token.type === Type.BlockComment || token.type === Type.LineComment) {
			let subTokens = getTokens(token.value);
			let range: vscode.Range = undefined;
			let text = '';
			for (let subToken of subTokens) {
				if (subToken.value === 'TODO') {
					let line = startLine + subToken.position.line;
					let startPosition = !subToken.position.line ? startChar + subToken.position.character : subToken.position.character;
					let endPosition = textDocument.lineAt(line).text.length;
					range = new vscode.Range(line, startPosition, line, endPosition);
				}
				else if (range) {
					if (subToken.type === Type.NewLine) {
						todos.push({ range, text });
						range = undefined;
						text = '';
						continue;
					}
					text += subToken.value;
				}
			}
			if (range) todos.push({ range, text })
			todos.forEach(todo => {
				let message = todo.text.trim().replace(/^:/gm,'').trim();
				if (!message) message = `TODO on line ${range.start.line+1}`;
				let diagnostic = new vscode.Diagnostic(todo.range, message, vscode.DiagnosticSeverity.Information)
				diagnostic.source = 'TODO';
				diagnostics.push(diagnostic)

			})
		}
	}
	todoDiagnostics.set(vscode.Uri.file(textDocument.fileName), diagnostics);
	vscode.workspace.onDidCloseTextDocument((textDocument) => {
		let uri = textDocument.uri;
		todoDiagnostics.delete(uri);
	})
}
