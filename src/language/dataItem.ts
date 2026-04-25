import * as path from "node:path";

import * as fs from "fs-extra";
import * as jsonc from "jsonc-parser";
import * as vscode from "vscode";

function getEnvBase(fileName: string) {
	return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fileName)).uri.fsPath;
}

export class DataHoverProvider implements vscode.HoverProvider {
	public async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<vscode.Hover | undefined> {

		// array of column names
		const columnNames: Array<string> = document.lineAt(0).text.split("\t");

		// the text up to the cursor
		const textToPosition: string = document.getText(
			new vscode.Range(position.line, 0, position.line, position.character)
		);

		// position of current data item
		const currentDataItemPosition: number = textToPosition.split("\t").length - 1;

		// full text of data item
		const dataItemText = document.lineAt(position.line).text.split("\t")[currentDataItemPosition];

		const prevTabPos: number = textToPosition.lastIndexOf("\t") + 1;
		const nextTabPos: number = prevTabPos + dataItemText.length;

		if (currentDataItemPosition <= columnNames.length) {
			const columnName = columnNames[currentDataItemPosition];
			const tableName = path.basename(document.fileName).replace(".DAT", "");
			const fileName = `${tableName.toUpperCase()}-${columnName.toUpperCase()}.COL`;
			const link = path.join(
				getEnvBase(document.fileName),
				"dataqwik",
				"table",
				tableName.toLowerCase(),
				fileName
			);
			let content: vscode.MarkdownString;
			if (!fs.existsSync(link)) {
				content = new vscode.MarkdownString(`COLUMN: **${columnName}**`);
			}
			else {
				const uri = vscode.Uri.file(link);
				const tbl = await vscode.workspace.openTextDocument(uri);
				const tblJSON = jsonc.parse(tbl.getText());
				content = new vscode.MarkdownString(
					`COLUMN: **[${columnName}]` +
					`(command:vscode.open?${encodeURIComponent(JSON.stringify(uri))})**` +
					` (*${tblJSON["DES"]}*)`
				);
			}
			content.isTrusted = true;
			return new vscode.Hover(
				content,
				new vscode.Range(position.line, prevTabPos, position.line, nextTabPos)
			);
		}

		return undefined;
	}
}

export class DataDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
	public async provideDocumentHighlights(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<vscode.DocumentHighlight[]> {
		// the text up to the cursor
		const textToPosition: string = document.getText(
			new vscode.Range(position.line, 0, position.line, position.character)
		);

		// position of current data item
		const currentDataItemPosition: number = textToPosition.split("\t").length - 1;

		const highlights: vscode.DocumentHighlight[] = [];
		for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
			const text = document.lineAt(lineNumber).text;
			if (!text) continue;
			const row = document.lineAt(lineNumber).text.split("\t");
			const dataItemText = row[currentDataItemPosition];
			const textToPosition = row.slice(0, currentDataItemPosition + 1).join("\t");
			const prevTabCol: number = textToPosition.lastIndexOf("\t") + 1;
			const nextTabCol: number = prevTabCol + dataItemText.length;
			const range = new vscode.Range(lineNumber, prevTabCol, lineNumber, nextTabCol);
			document.validateRange(range);
			const highlight = new vscode.DocumentHighlight(range, vscode.DocumentHighlightKind.Write);
			highlights.push(highlight);
		}
		return highlights;
	}

}
