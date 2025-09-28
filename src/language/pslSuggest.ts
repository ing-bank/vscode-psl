import * as path from 'node:path';

import * as vscode from 'vscode';

import { FinderPaths, getFinderPaths } from '@mischareitsma/psl-parser/config.ts';
import * as parser from '@mischareitsma/psl-parser/parser.ts';
import { MemberClass } from '@mischareitsma/psl-parser/parser.ts';
import * as utils from '@mischareitsma/psl-parser/utilities.ts';

import * as lang from './lang.ts';

export class PSLCompletionItemProvider implements vscode.CompletionItemProvider {

	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, cancellationToken: vscode.CancellationToken): Promise<PSLCompletionItem[] | undefined> {
		if (cancellationToken.isCancellationRequested) return;
		let parsedDoc = parser.parseText(document.getText());

		// get tokens on line and current token
		let tokenSearchResults = utils.searchTokens(parsedDoc.tokens, position);
		if (!tokenSearchResults) return;
		let { tokensOnLine, index } = tokenSearchResults;

		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		let callTokens = utils.getCallTokens(tokensOnLine, index);
		if (callTokens.length === 0) return;
		let paths: FinderPaths = getFinderPaths(workspaceDirectory.uri.fsPath, document.fileName);
		let finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		let result = await finder.resolveResult(callTokens.slice(0, -1));
		let resultFinder = result.member ? await finder.newFinder(result.member.types[0].value) : await finder.newFinder(path.basename(result.fsPath).split('.')[0]);
		let resolvedResults = await resultFinder.findAllInDocument();
		if (resolvedResults) return getCompletionItems(resolvedResults, finder);
	}

	async resolveCompletionItem(item: PSLCompletionItem) {
		let { code, markdown } = await lang.getDocumentation(item.result, item.finder);

		let clean = markdown.replace(/\s*(DOC)?\s*\-+/, '').replace(/\*+\s+ENDDOC/, '').trim();
		clean = clean
			.split(/\r?\n/g).map(l => l.trim()).join('\n')
			.replace(/(@\w+)/g, '*$1*')
			.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, '$1 `$4`');

		item.detail = code;
		item.documentation = new vscode.MarkdownString().appendMarkdown(clean);
		return item;
	}
}

async function getCompletionItems(results: utils.FinderResult[], finder: utils.ParsedDocFinder): Promise<PSLCompletionItem[]> {
	let ret = results.map(async result => {
		const item = new PSLCompletionItem(result.member.id.value);
		item.kind = result.member.memberClass === MemberClass.method ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Property;
		item.result = result;
		item.finder = finder;
		return item;
	})
	return Promise.all(ret);
}

class PSLCompletionItem extends vscode.CompletionItem {
	result: utils.FinderResult;
	finder: utils.ParsedDocFinder;
}
