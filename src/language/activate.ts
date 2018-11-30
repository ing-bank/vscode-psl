import * as vscode from 'vscode';

import { PSL_MODE, BATCH_MODE, TRIG_MODE, DATA_MODE } from '../extension';

import { PSLDocumentSymbolProvider } from './pslDocument';
import { DataHoverProvider, DataDocumentHighlightProvider } from './dataItem';
import { PSLCompletionItemProvider } from './pslSuggest';
import { PSLDefinitionProvider } from './pslDefinitionProvider';
import { PSLHoverProvider } from './pslHoverProvider';
import * as codeQuality from './codeQuality';
import { PSLSignatureHelpProvider } from './pslSignature';
import * as previewDocumentation from './previewDocumentation';


export async function activate(context: vscode.ExtensionContext) {

	const PSL_MODES = [PSL_MODE, BATCH_MODE, TRIG_MODE];

	// Document Symbol Outline
	PSL_MODES.forEach(mode => {
		context.subscriptions.push(
			vscode.languages.registerDocumentSymbolProvider(
				mode, new PSLDocumentSymbolProvider()
			)
		);
	})

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

	let preview: boolean = vscode.workspace.getConfiguration('psl', null).get('previewFeatures');

	if (preview) {

		PSL_MODES.forEach(mode => {

			// Completion Items
			context.subscriptions.push(
				vscode.languages.registerCompletionItemProvider(
					mode, new PSLCompletionItemProvider(), '.'
				)
			);

			// Signature Help
			context.subscriptions.push(
				vscode.languages.registerSignatureHelpProvider(
					mode, new PSLSignatureHelpProvider(), '(', ','
				)
			);

			// Go-to Definitions
			context.subscriptions.push(
				vscode.languages.registerDefinitionProvider(
					mode, new PSLDefinitionProvider()
				)
			);

			// Hovers
			context.subscriptions.push(
				vscode.languages.registerHoverProvider(
					mode, new PSLHoverProvider()
				)
			);

		})

	}

	// Code quality
	codeQuality.activate(context);

	previewDocumentation.activate(context);

	// Language Configuration
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\'\'\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration('psl', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileBatch', { wordPattern });
	vscode.languages.setLanguageConfiguration('profileTrigger', { wordPattern });
}
