import * as vscode from 'vscode';
import { FinderPaths, getFinderPaths } from '../parser/config';
import * as parser from '../parser/parser';
import * as utils from '../parser/utilities';
import * as lang from './lang';

export class PSLHoverProvider implements vscode.HoverProvider {

	async provideHover(document: vscode.TextDocument, position: vscode.Position, cancellationToken: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
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
		let resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult) return getHover(resolvedResult, finder);
	}
}

async function getHover(result: utils.FinderResult, finder: utils.ParsedDocFinder): Promise<vscode.Hover> {
	let { code, markdown } = await lang.getDocumentation(result, finder);

	let clean = markdown.replace(/\s*(DOC)?\s*\-+/, '').replace(/\*+\s+ENDDOC/, '').trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join('\n')
		.replace(/(@\w+)/g, '*$1*')
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, '$1 `$4`');

	return new vscode.Hover([new vscode.MarkdownString().appendCodeblock(code), new vscode.MarkdownString().appendMarkdown(clean)]);
}
