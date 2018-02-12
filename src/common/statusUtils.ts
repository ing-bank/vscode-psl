import * as vscode from 'vscode';

export function updateStatus(status: vscode.StatusBarItem, langs: Array<string>) {
	if (langs.length === 0) {
		status.show();
	}
	else if (vscode.window.activeTextEditor && langs.indexOf(vscode.window.activeTextEditor.document.languageId) >= 0) {
		status.show();
	}
	else {
		status.hide();
	}
}