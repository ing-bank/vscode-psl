import * as vscode from 'vscode';

import { PSL_MODE, BATCH_MODE, TRIG_MODE, DATA_MODE } from '../extension';

import { PSLDocumentSymbolProvider } from './pslDocument';
import { DataHoverProvider, DataDocumentHighlightProvider } from './dataItem';
import { PSLCompletionItemProvider } from './pslSuggest';
import { PSLFormatProvider } from './pslFormat';
import * as todos from './todos';
import * as parser from '../parser/parser';

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

	// TODOs
	todos.activate(context);

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			PSL_MODE, new PSLFormatProvider()
		)
	);


	let formatDiagnostics = vscode.languages.createDiagnosticCollection('psl-format');
	context.subscriptions.push(formatDiagnostics);
	if (vscode.window.activeTextEditor) {
		formatHandler(vscode.window.activeTextEditor.document, formatDiagnostics)
	}
	vscode.workspace.onDidOpenTextDocument((textDocument) => formatHandler(textDocument, formatDiagnostics))
	vscode.workspace.onDidChangeTextDocument((e) => formatHandler(e.document, formatDiagnostics))


	// Language Configuration
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\'\'\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration('psl', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileBatch', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileTrigger', { wordPattern });
}


function formatHandler(textDocument: vscode.TextDocument, formatDiagnostics: vscode.DiagnosticCollection) {
	let p = new parser.Parser();
	let diagnostics = [];
	p.parseDocument(textDocument.getText());

	// call specific rules
	parameterOnNewLine(p, diagnostics);

	formatDiagnostics.set(vscode.Uri.file(textDocument.fileName), diagnostics);
	vscode.workspace.onDidCloseTextDocument(textDocument => formatDiagnostics.delete(textDocument.uri));
}

function parameterOnNewLine(p: parser.Parser, diagnostics: vscode.Diagnostic[]) {
	p.methods.forEach(method => {
		let methodLine = method.id.position.line;
		method.parameters.forEach(param => {
			let paramPosition = param.id.position;
			if (paramPosition.line === methodLine && method.parameters.length > 1) {
				let diagnostic = new vscode.Diagnostic(new vscode.Range(paramPosition.line, paramPosition.character, paramPosition.line, paramPosition.character + param.id.value.length), `${param.id.value} on same line as method declaration.`, vscode.DiagnosticSeverity.Warning);
				diagnostic.source = 'format';
				diagnostics.push(diagnostic);
			}
		});
	});
}
