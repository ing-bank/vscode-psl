import * as vscode from 'vscode';
import { FinderPaths, getFinderPaths } from '../parser/config';
import * as parser from 'psl-parser';
import * as utils from '../parser/utilities';
import * as lang from './lang';

export class PSLDefinitionProvider implements vscode.DefinitionProvider {

	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, cancellationToknen: vscode.CancellationToken): Promise<vscode.Definition | undefined> {
		if (cancellationToknen.isCancellationRequested) return;
		let parsedDoc = parser.parseText(document.getText());

		// get tokens on line and current token
		let tokenSearchResults = utils.searchTokens(parsedDoc.tokens, position);
		if (!tokenSearchResults) return [];
		let { tokensOnLine, index } = tokenSearchResults;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		let callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		let paths: FinderPaths = getFinderPaths(workspaceDirectory.uri.fsPath, document.fileName);
		let finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		let resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult) return getLocation(resolvedResult);
	}
}

function getLocation(result: utils.FinderResult): vscode.Location {
	if (!result.member) {
		return new vscode.Location(vscode.Uri.file(result.fsPath), new vscode.Position(0, 0));
	}
	let range = result.member.id.getRange();
	let vscodeRange = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);
	return new vscode.Location(vscode.Uri.file(result.fsPath), vscodeRange);
}
