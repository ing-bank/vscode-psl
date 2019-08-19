import * as fs from 'fs';
import * as path from 'path';
import { TextDocument, ViewColumn, window, workspace } from 'vscode';

// Checks for the existence and read rights of a file and returns a Promise
export function existsReadableFileAsync(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

// Reads the contents of a file and returns a Promise
export function readFileAsync(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

// Reads the contents of a directory in a list and returns a Promise
export function readDirAsync(filePath: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		fs.readdir(filePath, (err, files) => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});
}

// Detects and returns the new line separator for a file
export function getLineSeparator(contents: string): string {
	let separator: string;

	if (contents.includes('\r\n')) {
		separator = '\r\n';
	} else if (contents.includes('\r')) {
		separator = '\r';
	} else if (contents.includes('\n')) {
		separator = '\n';
	} else {
		separator = '';
	}

	return separator;
}

// Checks whether a text document is of .DAT format
export function isDatFile(document: TextDocument) {
	if (document) {
		const lang = document.languageId.toLowerCase();
		const allowed = ['dat'];
		return allowed.find(a => a === lang) && document.uri.scheme !== 'dat-preview';
	}

	return false;
}

export function isStdinFile(document: TextDocument) {
	const allowed = workspace.getConfiguration('dat-preview').get('openStdin') as boolean;
	return (allowed && document) ? path.basename(document.fileName).match('code-stdin-[^.]+.txt') : false;
}

// Returns the column index of the active editor
export function getViewColumn(): ViewColumn {
	const active = window.activeTextEditor;
	return active ? active.viewColumn : ViewColumn.One;
}

// Checks whether a given column is computed or not
export function isComputedColumn(tableDirectoryPath: string, tableName: string, columnName: string) {
	const fileName: string = tableName.toUpperCase() + '-' + columnName.toUpperCase() + '.COL';
	const filePath: string = path.join(tableDirectoryPath, fileName);

	try {
		// If the column file does not contain the "CMP" field or the column file does not exist,
		// consider that the column is computed, for easier handling of file headers
		const fileContents: string = fs.readFileSync(filePath, 'utf8');
		const lines: string[] = fileContents.split(getLineSeparator(fileContents));

		for (let i = 0; i < lines.length; i++) {
			let line: string = lines[i].trim();

			if (line.startsWith('"CMP"')) {
				line = line.split(':')[1].trim();
				const value: string = line.substr(0, line.length - 1);

				return !(value === 'null');
			}
		}

		return true;
	} catch (error) {
		return true;
	}
}

// Does nothing for the specified number of miliseconds
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}
