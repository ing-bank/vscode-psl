import * as vscode from "vscode";

import { FinderPaths, getFinderPaths } from "@profile-psl/psl-parser/config.js";
import * as parser from "@profile-psl/psl-parser/parser.js";
import * as utils from "@profile-psl/psl-parser/utilities.js";

import * as lang from "./lang.ts";

export class PSLDefinitionProvider implements vscode.DefinitionProvider {

	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		cancellationToken: vscode.CancellationToken): Promise<vscode.Definition | undefined> {
		if (cancellationToken.isCancellationRequested) return;
		const parsedDoc = parser.parseText(document.getText());

		// get tokens on line and current token
		const tokenSearchResults = utils.searchTokens(parsedDoc.tokens, position);
		if (!tokenSearchResults) return [];
		const { tokensOnLine, index } = tokenSearchResults;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		const callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		const paths: FinderPaths = getFinderPaths(workspaceDirectory.uri.fsPath, document.fileName);
		const finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		const resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult) return getLocation(resolvedResult);
	}
}

function getLocation(result: utils.FinderResult): vscode.Location {
	if (!result.member) {
		return new vscode.Location(vscode.Uri.file(result.fsPath), new vscode.Position(0, 0));
	}
	const range = result.member.id.getRange();
	const vscodeRange = new vscode.Range(
		range.start.line,
		range.start.character,
		range.end.line,
		range.end.character
	);
	return new vscode.Location(vscode.Uri.file(result.fsPath), vscodeRange);
}
