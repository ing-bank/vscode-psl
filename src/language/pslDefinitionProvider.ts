import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as utils from '../parser/utillities';

const pslCls = '.vscode/pslcls/'
const pslPaths = ['dataqwik/procedure/', 'test/utgood/', 'test/stgood/'];

export class PSLDefinitionProvider implements vscode.DefinitionProvider {

	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, cancellationToknen: vscode.CancellationToken): Promise<vscode.Definition | undefined> {
		if (cancellationToknen.isCancellationRequested) return;
		let parsedDoc = parser.parseText(document.getText());
		let procName = path.basename(document.fileName).split('.')[0];

		// get tokens on line and current token
		let result = utils.searchTokens(parsedDoc.tokens, position);
		if (!result) return [];
		let { tokensOnLine, index } = result;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		const fullPslClsDir = path.join(workspaceDirectory.uri.fsPath, pslCls);
		const fullPslPaths = pslPaths.concat(pslCls).map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath));

		let callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		if (callTokens.length === 1) {
			let finder = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths);
			let result = await finder.searchParser(callTokens[0]);
			
			// check for core class
			if (!result) {
				let pslClsNames = await getPslClsNames(fullPslClsDir);
				if (pslClsNames.indexOf(callTokens[0].value) >= 0) {
					finder = await finder.newFinder(callTokens[0].value);
					return new vscode.Location(vscode.Uri.file(finder.fsPath), new vscode.Position(0, 0));
				}
			}
			
			// handle static types
			else if (result.member.types[0] === callTokens[0]) {
				finder = await finder.newFinder(result.member.id.value);
				return new vscode.Location(vscode.Uri.file(finder.fsPath), new vscode.Position(0, 0));
			}
		
			// also handle records?
		
			return getLocation(result);
		}
		else {
			let finder: utils.ParsedDocFinder | undefined = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths);
			let result;
			for (let index = 0; index < callTokens.length; index++) {
				const token = callTokens[index];

				if (index === 0) {
					// handle core class					
					let pslClsNames = await getPslClsNames(fullPslClsDir);
					if (pslClsNames.indexOf(token.value) >= 0) {
						finder = await finder.newFinder(token.value);
						continue;
					}
					// skip over 'this'
					else if (token.value === 'this' || token.value === procName) {
						continue;
					}
					else {
						result = await finder.searchParser(token);
					}
				}

				if (!result) result = await finder.searchInDocument(token);
				if (!result) return;
				if (!callTokens[index + 1]) return getLocation(result);
				finder = await finder.newFinder(result.member.types[0].value);
				result = undefined;
			}
		}

	}
}

async function getPslClsNames(dir: string) {
	let names = await fs.readdir(dir);
	return names.map(name => name.split('.')[0]);
}

function getLocation(result: utils.FinderResult): vscode.Location {
	let range = result.member.id.getRange();
	let vscodeRange = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);
	return new vscode.Location(vscode.Uri.file(result.fsPath), vscodeRange);
}