import * as vscode from 'vscode';
import * as tokenizer from '../parser/tokenizer';
import * as parser from '../parser/parser';

export class PSLDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {
			let parsedDoc = parser.parseText(document.getText());
			let symbols: vscode.SymbolInformation[] = [];
			parsedDoc.methods.forEach(method => {
				let methodToken = this.getMethodNameToken(method);
				let name = methodToken.value;
				let containerName = '';

				let startPosition = new vscode.Position(methodToken.position.line, 0);

				let endPostionNumber = method.endLine;
				if (endPostionNumber === -1) endPostionNumber = document.lineCount - 1; // last line
				let endPosition = new vscode.Position(endPostionNumber, 0);
				let methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));
				let kind = method.batch ? vscode.SymbolKind.File : vscode.SymbolKind.Function
				symbols.push(new vscode.SymbolInformation(name, kind, containerName, methodRange));
			})
			parsedDoc.properties.forEach(property => {
				let propertyNameToken = property.id;
				let name = propertyNameToken.value;
				let containerName = '';
				let postion = propertyNameToken.position
				let location = new vscode.Location(document.uri, new vscode.Position(postion.line, postion.character))
				symbols.push(new vscode.SymbolInformation(name, vscode.SymbolKind.Property, containerName, location));
			})
			resolve(symbols);
		})
	}

	getMethodNameToken(method: parser.IMethod): tokenizer.Token {
		return method.id;
	}
}