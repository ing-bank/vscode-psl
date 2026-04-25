import * as path from "node:path";

import * as vscode from "vscode";

import { FinderPaths, getFinderPaths } from "@profile-psl/psl-parser/config.js";
import * as parser from "@profile-psl/psl-parser/parser.js";
import { MemberClass } from "@profile-psl/psl-parser/parser.js";
import * as utils from "@profile-psl/psl-parser/utilities.js";

import * as lang from "./lang.ts";

export class PSLCompletionItemProvider implements vscode.CompletionItemProvider {

	async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		cancellationToken: vscode.CancellationToken
	): Promise<PSLCompletionItem[] | undefined> {
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
		const result = await finder.resolveResult(callTokens.slice(0, -1));
		const resultFinder = result.member ?
			await finder.newFinder(result.member.types[0].value) :
			await finder.newFinder(path.basename(result.fsPath).split(".")[0]);
		const resolvedResults = await resultFinder.findAllInDocument();
		if (resolvedResults) return getCompletionItems(resolvedResults, finder);
	}

	async resolveCompletionItem(item: PSLCompletionItem) {
		const { code, markdown } = await lang.getDocumentation(item.result, item.finder);

		// TODO: (Mischa Reitsma, 2026-01-24) Create test before removing useless escape. Also: code duplication
		// eslint-disable-next-line no-useless-escape
		let clean = markdown.replace(/\s*(DOC)?\s*\-+/, "").replace(/\*+\s+ENDDOC/, "").trim();
		clean = clean
			.split(/\r?\n/g).map(l => l.trim()).join("\n")
			.replace(/(@\w+)/g, "*$1*")
			// TODO: (Mischa Reitsma, 2026-01-24) Create test before removing useless escape. Also: code duplication
			// eslint-disable-next-line no-useless-escape
			.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, "$1 `$4`");

		item.detail = code;
		item.documentation = new vscode.MarkdownString().appendMarkdown(clean);
		return item;
	}
}

async function getCompletionItems(
	results: utils.FinderResult[],
	finder: utils.ParsedDocFinder
): Promise<PSLCompletionItem[]> {
	const ret = results.map(async result => {
		const item = new PSLCompletionItem(result.member.id.value);
		item.kind = result.member.memberClass === MemberClass.method ?
			vscode.CompletionItemKind.Method :
			vscode.CompletionItemKind.Property;
		item.result = result;
		item.finder = finder;
		return item;
	});
	return Promise.all(ret);
}

class PSLCompletionItem extends vscode.CompletionItem {
	result: utils.FinderResult;
	finder: utils.ParsedDocFinder;
}
