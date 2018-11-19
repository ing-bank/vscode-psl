import * as vscode from 'vscode';

export async function showPreview(pslText: string) {
	const markdown: string = await getMarkdownFromApi(pslText);
	const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
	vscode.commands.executeCommand('markdown.showPreview', doc.uri);
}

async function getMarkdownFromApi(pslText: string) {
	return pslText;
}
