import * as path from 'path';
import * as vscode from 'vscode';
import * as jsonc from 'jsonc-parser';
import * as fs from 'fs-extra'

function getEnvBase(fileName: string) {
	return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fileName)).uri.fsPath
}

export class DataHoverProvider implements vscode.HoverProvider {
	public async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {

		// array of column names
		let columnNames: Array<string> = document.lineAt(0).text.split('\t');

		// the text up to the cursor
		let textToPosition: string = document.getText(new vscode.Range(position.line, 0, position.line, position.character));

		// position of current data item
		let currentDataItemPosition: number = textToPosition.split('\t').length - 1;

		// full text of data item
		let dataItemText = document.lineAt(position.line).text.split('\t')[currentDataItemPosition];

		let prevTabPos: number = textToPosition.lastIndexOf('\t') + 1;
		let nextTabPos: number = prevTabPos + dataItemText.length;

		if (currentDataItemPosition <= columnNames.length) {
			let columnName = columnNames[currentDataItemPosition];
			let tableName = path.basename(document.fileName).replace('.DAT', '')
			let fileName = `${tableName.toUpperCase()}-${columnName.toUpperCase()}.COL`
			let link = path.join(getEnvBase(document.fileName), 'dataqwik', 'table', `${tableName.toLowerCase()}`, `${fileName}`)
			let content;
			if (!fs.existsSync(link)) {
				content = new vscode.MarkdownString(`COLUMN: **${columnName}**`);
			}
			else {
				let uri = vscode.Uri.file(link)
				let tbl = await vscode.workspace.openTextDocument(uri);
				let tblJSON = jsonc.parse(tbl.getText())
				content = new vscode.MarkdownString(`COLUMN: **[${columnName}](command:vscode.open?${encodeURIComponent(JSON.stringify(uri))})** (*${tblJSON['DES']}*)`);
			}
			content.isTrusted = true;
			return new vscode.Hover(content, new vscode.Range(position.line, prevTabPos, position.line, nextTabPos))
		}

		return undefined;
	}
}

export class DataDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
	public async provideDocumentHighlights(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.DocumentHighlight[]> {
		// the text up to the cursor
		let textToPosition: string = document.getText(new vscode.Range(position.line, 0, position.line, position.character));

		// position of current data item
		let currentDataItemPosition: number = textToPosition.split('\t').length - 1;

		let highlights: vscode.DocumentHighlight[] = [];
		for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
			let text = document.lineAt(lineNumber).text
			if (!text) continue;
			let row = document.lineAt(lineNumber).text.split('\t')
			let dataItemText = row[currentDataItemPosition];
			let textToPosition = row.slice(0, currentDataItemPosition + 1).join('\t')
			let prevTabCol: number = textToPosition.lastIndexOf('\t') + 1;
			let nextTabCol: number = prevTabCol + dataItemText.length;
			let range = new vscode.Range(lineNumber, prevTabCol, lineNumber, nextTabCol)
			document.validateRange(range)
			let highlight = new vscode.DocumentHighlight(range, vscode.DocumentHighlightKind.Write)
			highlights.push(highlight)
		}
		return highlights;
	}

}