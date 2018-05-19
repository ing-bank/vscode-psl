import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as utils from '../parser/utillities';

const pslCls = '.vscode/pslcls/';
const pslPaths = ['dataqwik/procedure/', 'test/utgood/', 'test/stgood/'];
const tablePath = 'dataqwik/table/'

export class PSLHoverProvider implements vscode.HoverProvider {

	async provideHover(document: vscode.TextDocument, position: vscode.Position, cancellationToknen: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
		if (cancellationToknen.isCancellationRequested) return;
		let parsedDoc = parser.parseText(document.getText());
		let procName = path.basename(document.fileName).split('.')[0];

		// get tokens on line and current token
		let tokenSearchResults = utils.searchTokens(parsedDoc.tokens, position);
		if (!tokenSearchResults) return;
		let { tokensOnLine, index } = tokenSearchResults;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		const fullPslClsDir = path.join(workspaceDirectory.uri.fsPath, pslCls);
		const fullPslPaths = pslPaths.concat(pslCls).map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath));
		const fullTablePath = path.join(workspaceDirectory.uri.fsPath, tablePath);

		const getWorkspaceDocumentText = async (fsPath: string): Promise<string> => {
			return fs.stat(fsPath).then(() => {
				return vscode.workspace.openTextDocument(fsPath).then(textDocument => textDocument.getText(), () => '');
			}).catch(() => '')
		}

		let callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		if (callTokens.length === 1) {
			let finder = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths, tablePath, getWorkspaceDocumentText);
			let result = await finder.searchParser(callTokens[0]);

			// check for core class or tables
			if (!result) {
				return;
				let pslClsNames = await getPslClsNames(fullPslClsDir);
				if (pslClsNames.indexOf(callTokens[0].value) >= 0) {
					finder = await finder.newFinder(callTokens[0].value);
					// return new vscode.Location(vscode.Uri.file(finder.fsPath), new vscode.Position(0, 0));
				}
				let tableName = callTokens[0].value.replace('Record', '');
				let tableLocation = path.join(fullTablePath, tableName.toLowerCase(), tableName.toUpperCase() + '.TBL');
				let tableLocationExists = await fs.pathExists(tableLocation);
				// if (tableLocationExists) return new vscode.Location(vscode.Uri.file(tableLocation), new vscode.Position(0, 0));
			}

			// handle static types
			else if (result.member.types[0] === callTokens[0]) {
				finder = await finder.newFinder(result.member.id.value);
				// return new vscode.Location(vscode.Uri.file(finder.fsPath), new vscode.Position(0, 0));
				return;
			}

			return getHover(result);
		}
		else {
			let finder: utils.ParsedDocFinder | undefined = new utils.ParsedDocFinder(parsedDoc, document.fileName, fullPslPaths, fullTablePath, getWorkspaceDocumentText);
			let result: utils.FinderResult;
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

				if (!result) result = await finder.searchInDocument(token.value);
				if (!result) return;
				if (!callTokens[index + 1]) return getHover(result);
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

function getHover(result: utils.FinderResult): vscode.Hover {
	if (!result.member.documentation) return undefined;
	let clean = result.member.documentation.replace(/\s*(DOC)?\s*\-+/g, '').replace(/\*+\s+ENDDOC/, '').trim();
	clean = clean.split(/\r?\n/g).map(l => l.trim()).join('\n').replace(/\n{2,}/g, '\n\n').replace(/(^|[^\n])\n(?!\n)/g, '$1 ').replace(/\t{2,}/g, ' ').replace(/ {2,}/g, ' ').replace(/(@\w+)\s+(\w+)/g, '*$1* `$2`');
	return new vscode.Hover(new vscode.MarkdownString(clean));
}