import * as vscode from 'vscode';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as utils from '../parser/utillities';

const pslPaths = ['dataqwik/procedure/', 'test/utgood/', 'test/stgood/', '.vscode/pslcls/'];

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

		const fullPslPaths = pslPaths.map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath));

		let callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		if (callTokens.length === 1) {
			let finder = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths);
			let result = await finder.searchParser(callTokens[0]);
			if (!result) return;
			return getLocation(result);
		}
		else {
			if (callTokens[0].value === 'this' || callTokens[0].value === procName) {
				let finder = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths);
				let result = await finder.searchParser(callTokens[1]);
				if (!result) return;
				if (result.member.id === callTokens[0]) {
					// TODO
				}
				return getLocation(result);
			}
			else {
				let finder: utils.ParsedDocFinder | undefined = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths);
				for (let index = 0; index < callTokens.length; index++) {
					const token = callTokens[index];
					let result = await finder.searchParser(token);
					if (!result) return;
					if (!callTokens[index + 1]) return getLocation(result);
					finder = await finder.newFinder(result.member.types[0].value);
				}
				// const finder = new utils.ParsedDocFinder(parsedDoc, path.basename(document.fileName).split('.')[0], pslPaths);
				// finder.getWorkspaceDocumentText = () => {
				// 	finder.pslPaths;
				// }
				// let variable = utils.searchParser(parsedDoc, tokensOnLine[index], pslPaths);
				// if (!variable) return;
				// if (variable.types[0] && variable.id.value === variable.types[0].value) {
				// 	let classPath = path.join(getEnvBase(document.fileName), 'dataqwik', 'procedure', variable.id.value + '.PROC');
				// 	if (fs.existsSync(classPath)) {
				// 		return new vscode.Location(vscode.Uri.file(classPath), new vscode.Position(0, 0));
				// 	}
				// }
				// else {
				// 	let variableRange = variable.id.getRange();
				// 	let vscodeRange = new vscode.Range(variableRange.start.line, variableRange.start.character, variableRange.end.line, variableRange.end.character);
				// 	return new vscode.Location(document.uri, vscodeRange);
				// }
			}
		}

	}
}

function getLocation(result: utils.FinderResult): vscode.Location {
	let range = result.member.id.getRange();
	let vscodeRange = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);
	return new vscode.Location(vscode.Uri.file(result.fsPath), vscodeRange);
}