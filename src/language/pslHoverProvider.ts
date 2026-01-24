import * as vscode from "vscode";

import { FinderPaths, getFinderPaths } from "@profile-psl/psl-parser/config.js";
import * as parser from "@profile-psl/psl-parser/parser.js";
import * as utils from "@profile-psl/psl-parser/utilities.js";

import * as lang from "./lang.ts";

export class PSLHoverProvider implements vscode.HoverProvider {

	async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		cancellationToken: vscode.CancellationToken
	): Promise<vscode.Hover | undefined> {
		if (cancellationToken.isCancellationRequested) return;
		const parsedDoc = parser.parseText(document.getText());

		// get tokens on line and current token
		const tokenSearchResults = utils.searchTokens(parsedDoc.tokens, position);
		if (!tokenSearchResults) return;
		const { tokensOnLine, index } = tokenSearchResults;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		const callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		const paths: FinderPaths = getFinderPaths(workspaceDirectory.uri.fsPath, document.fileName);
		const finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		const resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult) return getHover(resolvedResult, finder);
	}
}

async function getHover(result: utils.FinderResult, finder: utils.ParsedDocFinder): Promise<vscode.Hover> {
	const { code, markdown } = await lang.getDocumentation(result, finder);

	// TODO: (Mischa Reitsma, 2026-01-24) Useless escape, make test before removing it.
	// eslint-disable-next-line no-useless-escape
	let clean = markdown.replace(/\s*(DOC)?\s*\-+/, "").replace(/\*+\s+ENDDOC/, "").trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join("\n")
		.replace(/(@\w+)/g, "*$1*")
		// TODO: (Mischa Reitsma, 2026-01-24) Useless escape, make test before removing it.
		// eslint-disable-next-line no-useless-escape
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, "$1 `$4`");

	return new vscode.Hover(
		[
			new vscode.MarkdownString().appendCodeblock(code),
			new vscode.MarkdownString().appendMarkdown(clean)
		]
	);
}
