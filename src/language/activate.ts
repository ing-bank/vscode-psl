import * as vscode from 'vscode';

import { PSL_MODE, BATCH_MODE, TRIG_MODE, DATA_MODE } from '../extension';

import { PSLDocumentSymbolProvider } from './pslDocument';
import { DataHoverProvider, DataDocumentHighlightProvider } from './dataItem';
import { PSLCompletionItemProvider } from './pslSuggest';
import * as codeQuality from './codeQuality';


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

	// Code quality
	codeQuality.activate(context);

	// Language Configuration
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\'\'\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration('psl', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileBatch', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileTrigger', { wordPattern });
}

