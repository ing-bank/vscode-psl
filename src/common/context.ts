import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';

export const enum ContextMode {
	FILE = 1,
	DIRECTORY = 2,
	EMPTY = 3
}

export interface ExtensionCommandContext {
	fsPath: string;
}

export interface HostCommandContext {
	fsPath: string;
	mode: ContextMode;
}

export function getFullContext(context: ExtensionCommandContext | undefined, useActiveTextEditor?: boolean): HostCommandContext {
	let fsPath: string = '';
	let mode: ContextMode;
	let activeTextEditor = vscode.window.activeTextEditor;

	if (context) {
		fsPath = context.fsPath;
		mode = fsExtra.lstatSync(fsPath).isFile() ? ContextMode.FILE : ContextMode.DIRECTORY;
		return {fsPath, mode};
	}
	else if (useActiveTextEditor && activeTextEditor) {
		fsPath = activeTextEditor.document.fileName;
		mode = ContextMode.FILE;
		return {fsPath, mode};
	}
	else {
		mode = ContextMode.EMPTY;
		return {fsPath, mode};
	}
}