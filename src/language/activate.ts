import * as vscode from 'vscode';

import { BATCH_MODE, DATA_MODE, PSL_MODE, TRIG_MODE } from '../extension';

import * as codeQuality from './codeQuality';
import { DataDocumentHighlightProvider, DataHoverProvider } from './dataItem';
import { MumpsDocumentProvider, MumpsVirtualDocument } from './mumps';
import * as previewDocumentation from './previewDocumentation';
import { PSLDefinitionProvider } from './pslDefinitionProvider';
import { MumpsDocumentSymbolProvider, PSLDocumentSymbolProvider } from './pslDocument';
import { PSLHoverProvider } from './pslHoverProvider';
import { PSLSignatureHelpProvider } from './pslSignature';
import { PSLCompletionItemProvider } from './pslSuggest';

export async function activate(context: vscode.ExtensionContext) {

	const PSL_MODES = [PSL_MODE, BATCH_MODE, TRIG_MODE];
	const MUMPS_MODES: vscode.DocumentFilter[] = Object.values(MumpsVirtualDocument.schemes).map(scheme => ({ scheme }));

	context.subscriptions.push(
		// Data Hovers
		vscode.languages.registerHoverProvider(
			DATA_MODE, new DataHoverProvider(),
		),

		// Data Document Highlights
		vscode.languages.registerDocumentHighlightProvider(
			DATA_MODE, new DataDocumentHighlightProvider(),
		),
	);

	PSL_MODES.forEach(pslMode => {
		context.subscriptions.push(
			// Document Symbol Outline
			vscode.languages.registerDocumentSymbolProvider(
				pslMode, new PSLDocumentSymbolProvider(),
			),

			// Completion Items
			vscode.languages.registerCompletionItemProvider(
				pslMode, new PSLCompletionItemProvider(), '.',
			),

			// Signature Help
			vscode.languages.registerSignatureHelpProvider(
				pslMode, new PSLSignatureHelpProvider(), '(', ',',
			),

			// Go-to Definitions
			vscode.languages.registerDefinitionProvider(
				pslMode, new PSLDefinitionProvider(),
			),

			// Hovers
			vscode.languages.registerHoverProvider(
				pslMode, new PSLHoverProvider(),
			),
		);
	});

	MUMPS_MODES.forEach(mumpsMode => {
		context.subscriptions.push(
			// Content provider for virtual documents
			vscode.workspace.registerTextDocumentContentProvider(
				mumpsMode.scheme, new MumpsDocumentProvider(),
			),

			// Document Symbol Outline
			vscode.languages.registerDocumentSymbolProvider(
				mumpsMode, new MumpsDocumentSymbolProvider(),
			),
		);
	});

	codeQuality.activate(context);

	previewDocumentation.activate(context);

	// Language Configuration
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\'\'\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration('psl', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileBatch', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileTrigger', { wordPattern });
}

export function previewEnabled(uri: vscode.Uri) {
	return vscode.workspace.getConfiguration('psl', uri).get('previewFeatures');
}
