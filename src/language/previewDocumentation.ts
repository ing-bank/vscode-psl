import * as path from 'path';
import * as request from 'request-light/lib/main';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(
			'psl.previewDocumentation',
			preparePreview,
		),
	);

	checkForDocumentationServer();

	vscode.workspace.onDidChangeConfiguration(event => {
		if (!event.affectsConfiguration('psl')) return;
		checkForDocumentationServer();
	});
}

function checkForDocumentationServer(): string {
	const documentationServer: string = vscode.workspace.getConfiguration('psl', null).get('documentationServer');
	if (documentationServer) {
		vscode.commands.executeCommand('setContext', 'psl.hasDocumentationServer', true);
		return documentationServer;
	}
	else {
		vscode.commands.executeCommand('setContext', 'psl.hasDocumentationServer', false);
		return '';
	}
}

async function preparePreview(textEditor: vscode.TextEditor) {
	const documentationServer: string = checkForDocumentationServer();
	if (!documentationServer) return;

	const markdown = await getMarkdownFromApi(
		textEditor.document.getText(),
		path.basename(textEditor.document.fileName),
		documentationServer,
	);
	if (!markdown) return;
	showPreview(markdown);
}

async function showPreview(markdown: string) {
	const untitledDoc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
	vscode.commands.executeCommand('markdown.showPreview', untitledDoc.uri);
}

async function getMarkdownFromApi(pslText: string, fileName: string, documentationServer: string) {
	try {
		const data: string = JSON.stringify({
			sourceText: pslText,
		});
		const response = await request.xhr({
			data,
			headers: {
				'Content-Length': Buffer.byteLength(data),
				'Content-Type': 'application/json',
			},
			type: 'POST',
			url: documentationServer + fileName,
		});
		return response.responseText;
	}
	catch (e) {
		vscode.window.showErrorMessage(e.responseText);
		return '';
	}
}
