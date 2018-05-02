import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as parser from '../parser/parser';
import * as tokenizer from '../parser/tokenizer';
import * as utils from '../parser/utillities';

function getEnvBase(fileName: string) {
	return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fileName)).uri.fsPath
}

export class PSLDefinitionProvider implements vscode.DefinitionProvider {

	public async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition | undefined> {
		let parsedDoc = parser.parseText(document.getText());
		let procName = path.basename(document.fileName).split('.')[0];

		// get tokens on line and current token
		let result = utils.searchTokens(parsedDoc.tokens, position);
		if (!result) return [];
		let { tokensOnLine, index } = result;

		// parse line for completion
		let { reference, attribute } = utils.completion(tokensOnLine, index)
		if (attribute) {
			if (reference.value === 'this' || reference.value === procName) {
				return getThisLocation(parsedDoc, attribute, document.fileName);
			}
			else {
				let referenceVariable = utils.searchParser(parsedDoc, reference);
				if (referenceVariable.types[0]) {
					let classPath = path.join(getEnvBase(document.fileName), 'dataqwik', 'procedure', referenceVariable.types[0].value + '.PROC');
					let textDocument = await vscode.workspace.openTextDocument(classPath);
					let newParsedDoc = parser.parseText(textDocument.getText());
					return getThisLocation(newParsedDoc, attribute, classPath);
				}
			}
		}
		else if (reference) {
			return getThisLocation(parsedDoc, reference, document.fileName);
		}
		else {
			let variable = utils.searchParser(parsedDoc, tokensOnLine[index]);
			if (!variable) return;
			if (variable.types[0] && variable.id.value === variable.types[0].value) {
				let classPath = path.join(getEnvBase(document.fileName), 'dataqwik', 'procedure', variable.id.value + '.PROC');
				if (fs.existsSync(classPath)) {
					return new vscode.Location(vscode.Uri.file(classPath), new vscode.Position(0, 0));
				}
			}
			else {
				let variableRange = variable.id.getRange();
				let vscodeRange = new vscode.Range(variableRange.start.line, variableRange.start.character, variableRange.end.line, variableRange.end.character);
				return new vscode.Location(document.uri, vscodeRange);
			}
		}
	}
}

async function getThisLocation(parsedDoc: parser.IDocument, token: tokenizer.Token, fileName: string): Promise<vscode.Location> {
	let identifier = token.value;
	let target: parser.IMember;
	target = parsedDoc.methods.find(property => property.id.value === identifier);
	if (!target) target = parsedDoc.properties.find(property => property.id.value === identifier);
	if (!target && parsedDoc.extending) {
		let extendingPath = path.join(getEnvBase(fileName), 'dataqwik', 'procedure', parsedDoc.extending.value + '.PROC');
		let stat = await fs.stat(extendingPath);
		if (!stat.isFile()) return;
		let textDocument = await vscode.workspace.openTextDocument(extendingPath);
		let extendParse = parser.parseText(textDocument.getText());
		return getThisLocation(extendParse, token, extendingPath);
	}
	if (target) {
		let variableRange = target.id.getRange();
		let vscodeRange = new vscode.Range(variableRange.start.line, variableRange.start.character, variableRange.end.line, variableRange.end.character);
		return new vscode.Location(vscode.Uri.file(fileName), vscodeRange);
	}
}