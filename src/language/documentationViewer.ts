import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(
			'psl.previewDocumentation',
			preparePreview,
		),
	);
}

async function preparePreview(textEditor: vscode.TextEditor) {
	const documentationServer: string = vscode.workspace.
		getConfiguration('psl', textEditor.document.uri).get('documentationServer');
	if (!documentationServer) return;

	const markdown = await getMarkdownFromApi(textEditor.document.getText(), documentationServer);
	showPreview(markdown);
}

async function showPreview(markdown: string) {
	const untitledDoc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
	vscode.commands.executeCommand('markdown.showPreview', untitledDoc.uri);
}

async function getMarkdownFromApi(pslText: string, documentationServer: string) {
	// dummy return for now
	return `${documentationServer} ${pslText}`;
}
