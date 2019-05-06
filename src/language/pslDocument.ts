import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import * as tokenizer from '../parser/tokenizer';

export class PSLDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {
			const parsedDoc = parser.parseText(document.getText());
			const symbols: vscode.SymbolInformation[] = [];
			parsedDoc.methods.forEach(method => {
				const methodToken = this.getMethodNameToken(method);
				const name = methodToken.value;
				const containerName = '';

				const startPosition = new vscode.Position(methodToken.position.line, 0);

				let endPostionNumber = method.endLine;
				if (endPostionNumber === -1) endPostionNumber = document.lineCount - 1; // last line
				const endPosition = new vscode.Position(endPostionNumber, 0);
				const methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));
				const kind = method.batch ? vscode.SymbolKind.Module : vscode.SymbolKind.Function;
				symbols.push(new vscode.SymbolInformation(name, kind, containerName, methodRange));
			});
			parsedDoc.properties.forEach(property => {
				const propertyNameToken = property.id;
				const name = propertyNameToken.value;
				const containerName = '';
				const postion = propertyNameToken.position;
				const location = new vscode.Location(document.uri, new vscode.Position(postion.line, postion.character));
				symbols.push(new vscode.SymbolInformation(name, vscode.SymbolKind.Property, containerName, location));
			});
			resolve(symbols);
		});
	}

	getMethodNameToken(method: parser.Method): tokenizer.Token {
		return method.id;
	}
}
