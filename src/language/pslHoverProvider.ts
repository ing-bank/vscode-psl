import * as vscode from 'vscode';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as lang from './lang';
import * as utils from '../parser/utilities';

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
		let paths: utils.FinderPaths = {
			routine: document.fileName,
			corePsl: path.join(workspaceDirectory.uri.fsPath, lang.relativeCorePath),
			projectPsl: lang.relativeProjectPath.concat(lang.relativeCorePath).map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath)),
			table: path.join(workspaceDirectory.uri.fsPath, lang.relativeTablePath),
		}
		let finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		let resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult) return getHover(resolvedResult, paths.table);
	}
}



async function getHover(result: utils.FinderResult, tableDirectory: string): Promise<vscode.Hover> {
	let { code, markdown } = await lang.getDocumentation(result, tableDirectory);

	let clean = markdown.replace(/\s*(DOC)?\s*\-+/, '').replace(/\*+\s+ENDDOC/, '').trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join('\n')
		.replace(/(@\w+)/g, '*$1*')
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, '$1 `$4`');

	return new vscode.Hover([new vscode.MarkdownString().appendCodeblock(code), new vscode.MarkdownString().appendMarkdown(clean)]);
}
