import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { getVirtualDocument } from './mumps';

export class PSLDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {
			const parsedDoc = parser.parseText(document.getText());
			const symbols: vscode.SymbolInformation[] = [];
			parsedDoc.methods.forEach(method => {
				symbols.push(createMethodSymbol(method, document));
			});
			parsedDoc.properties.forEach(property => {
				const propertyNameToken = property.id;
				const name = propertyNameToken.value;
				const containerName = '';
				const position = propertyNameToken.position;
				const location = new vscode.Location(document.uri, new vscode.Position(position.line, position.character));
				symbols.push(new vscode.SymbolInformation(name, vscode.SymbolKind.Property, containerName, location));
			});
			resolve(symbols);
		});
	}
}

/**
 * Outline provider for MUMPS
 */
export class MumpsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): vscode.SymbolInformation[] {
		const symbols: vscode.SymbolInformation[] = [];
		const parsedDoc = this.getParsedDoc(document);
		parsedDoc.methods.forEach(method => {
			symbols.push(createMethodSymbol(method, document));
		});
		return symbols;
	}

	getParsedDoc(document: vscode.TextDocument) {
		const cachedMumps = getVirtualDocument(document.uri);
		if (cachedMumps) return cachedMumps.parsedDocument;
		else return parser.parseText(document.getText());
	}
}

function createMethodSymbol(method: parser.Method, document: vscode.TextDocument) {
	const methodToken = method.id;
	const name = methodToken.value;
	const containerName = '';

	const startPosition = new vscode.Position(methodToken.position.line, 0);

	let endPositionNumber = method.endLine;
	if (endPositionNumber === -1) endPositionNumber = document.lineCount - 1; // last line
	const endPosition = new vscode.Position(endPositionNumber, 0);
	const methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));
	const kind = method.batch ? vscode.SymbolKind.Module : vscode.SymbolKind.Function;
	return new vscode.SymbolInformation(name, kind, containerName, methodRange);
}
