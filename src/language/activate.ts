import * as vscode from "vscode";

import { setConfig, removeConfig } from "@profile-psl/psl-parser/config.js";

import { BATCH_MODE, DATA_MODE, PSL_MODE, TRIG_MODE } from "../extension.ts";
import * as codeQuality from "./codeQuality.ts";
import { DataDocumentHighlightProvider, DataHoverProvider } from "./dataItem.ts";
import { MumpsDocumentProvider, MumpsVirtualDocument } from "./mumps.ts";
import * as previewDocumentation from "./previewDocumentation.ts";
import { PSLDefinitionProvider } from "./pslDefinitionProvider.ts";
import { MumpsDocumentSymbolProvider, PSLDocumentSymbolProvider } from "./pslDocument.ts";
import { PSLHoverProvider } from "./pslHoverProvider.ts";
import { PSLSignatureHelpProvider } from "./pslSignature.ts";
import { PSLCompletionItemProvider } from "./pslSuggest.ts";

export async function activate(context: vscode.ExtensionContext) {

	const PSL_MODES = [PSL_MODE, BATCH_MODE, TRIG_MODE];
	const MUMPS_MODES: vscode.DocumentFilter[] = Object.values(MumpsVirtualDocument.schemes)
		.map(scheme => ({ scheme }));

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
				pslMode, new PSLCompletionItemProvider(), ".",
			),

			// Signature Help
			vscode.languages.registerSignatureHelpProvider(
				pslMode, new PSLSignatureHelpProvider(), "(", ",",
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

	projectActivate(context);
	codeQuality.activate(context);

	previewDocumentation.activate(context);

	// Language Configuration
	// TODO: (Mischa Reitsma, 2026-01-24) This pattern flags many useless escapes that would also bring back the line length, check if this can be done (write some tests for the pattern)
	// eslint-disable-next-line no-useless-escape, @stylistic/max-len
	const wordPattern = /(-?\d*\.\d[a-zA-Z0-9\%\#]*)|([^\`\~\!\@\^\&\*\(\)\-\=\+\[\{\]\}\\\|\"\;\:\"\"\,\.\<\>\/\?\s_]+)/g;
	vscode.languages.setLanguageConfiguration("psl", { wordPattern });
	vscode.languages.setLanguageConfiguration("profileBatch", { wordPattern });
	vscode.languages.setLanguageConfiguration("profileTrigger", { wordPattern });
}

export function previewEnabled(uri: vscode.Uri) {
	return vscode.workspace.getConfiguration("psl", uri).get("previewFeatures");
}

async function projectActivate(context: vscode.ExtensionContext) {
	const workspaces = new Map();
	if (vscode.workspace.workspaceFolders) {
		vscode.workspace.workspaceFolders.forEach(workspace => {
			workspaces.set(workspace.name, workspace.uri.fsPath);
		});
	}
	return Promise.all(
		vscode.workspace.workspaceFolders
			.map(workspace => new vscode.RelativePattern(workspace, "profile-project.json"))
			.map(async pattern => {
				const watcher = vscode.workspace.createFileSystemWatcher(pattern);
				context.subscriptions.push(watcher.onDidChange(uri => {
					setConfig(uri.fsPath, workspaces);
				}), watcher.onDidCreate(uri => {
					setConfig(uri.fsPath, workspaces);
				}));
				watcher.onDidDelete(uri => {
					removeConfig(uri.fsPath);
				});
				const uris = await vscode.workspace.findFiles(pattern);
				if (!uris.length) return;
				await setConfig(uris[0].fsPath, workspaces);
			}),
	);
}
