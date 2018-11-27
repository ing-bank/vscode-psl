import * as request from 'request-light';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(
			'psl.previewDocumentation',
			preparePreview,
		),
	);

	vscode.workspace.onDidChangeConfiguration(event => {
		if (!event.affectsConfiguration('psl')) return;
		const documentationServer: string = vscode.workspace.getConfiguration('psl').get('documentationServer');
		if (documentationServer) {
			vscode.commands.executeCommand('setContext', 'psl.hasDocumentationServer', true);
		}
	});
}

async function preparePreview(textEditor: vscode.TextEditor) {
	const documentationServer: string = vscode.workspace.
		getConfiguration('psl', textEditor.document.uri).get('documentationServer');
	if (!documentationServer) return;

	const markdown = await getMarkdownFromApi(textEditor.document.getText(), documentationServer);
	if (!markdown) return;
	showPreview(markdown);
}

async function showPreview(markdown: string) {
	const untitledDoc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
	vscode.commands.executeCommand('markdown.showPreview', untitledDoc.uri);
}

async function getMarkdownFromApi(pslText: string, documentationServer: string) {
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
			url: documentationServer,
		});
		return response.responseText;
	}
	catch (e) {
		vscode.window.showErrorMessage(e.responseText);
		return '';
	}
}
