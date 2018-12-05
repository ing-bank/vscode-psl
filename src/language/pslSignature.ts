import * as vscode from 'vscode';
import * as utils from '../parser/utilities';
import * as parser from '../parser/parser';
import * as lang from './lang';
import * as path from 'path';
import { Token, Position } from '../parser/tokenizer';

export class PSLSignatureHelpProvider implements vscode.SignatureHelpProvider {
	public async provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.SignatureHelp> {
		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		let parsedDoc = parser.parseText(document.getText());
		// get tokens on line and current token
		let tokenSearchResults = ((tokens: Token[], position: Position) => {
			const tokensOnLine = tokens.filter(t => t.position.line === position.line);
			if (tokensOnLine.length === 0) return undefined;
			const index = tokensOnLine.findIndex(t => {
				const start: Position = t.position;
				const end: Position = { line: t.position.line, character: t.position.character + t.value.length };
				const isBetween = (lb: Position, t: Position, ub: Position): boolean => {
					return lb.line <= t.line &&
						lb.character <= t.character &&
						ub.line >= t.line &&
						ub.character >= t.character;
				}
				return isBetween(start, position, end);
			});
			return { tokensOnLine, index };
		})(parsedDoc.tokens, position);

		if (!tokenSearchResults) return;
		let { tokensOnLine, index } = tokenSearchResults;

		let { callTokens, parameterIndex } = utils.findCallable(tokensOnLine, index);

		if (callTokens.length === 0) return;
		let paths: utils.FinderPaths = {
			routine: document.fileName,
			corePsl: path.join(workspaceDirectory.uri.fsPath, lang.relativeCorePath),
			projectPsl: lang.relativeProjectPath.concat(lang.relativeCorePath).map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath)),
			table: path.join(workspaceDirectory.uri.fsPath, lang.relativeTablePath),
		}
		let finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		let resolvedResult = await finder.resolveResult(callTokens);
		if (!resolvedResult.member || resolvedResult.member.memberClass !== parser.MemberClass.method) return;
		if (resolvedResult) return getSignature(resolvedResult, paths.table, parameterIndex);
	}
}

async function getSignature(result: utils.FinderResult, tableDirectory: string, parameterIndex: number): Promise<vscode.SignatureHelp> {
	let { code, markdown } = await lang.getDocumentation(result, tableDirectory);

	let clean = markdown.replace(/\s*(DOC)?\s*\-+/, '').replace(/\*+\s+ENDDOC/, '').trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join('\n')
		.replace(/(@\w+)/g, '*$1*')
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, '$1 `$4`');
		
	let method = result.member as parser.Method;
	let argString: string = method.parameters.map((param: parser.Parameter) => `${param.types[0].value} ${param.id.value}`).join(', ');
	code = `${method.id.value}(${argString})`;

	let info = new vscode.SignatureInformation(code, new vscode.MarkdownString().appendMarkdown(clean));
	info.parameters = method.parameters.map(parameter => new vscode.ParameterInformation(`${parameter.types[0].value} ${parameter.id.value}`));

	let signatureHelp = new vscode.SignatureHelp();
	signatureHelp.signatures = [info];
	signatureHelp.activeSignature = 0;
	signatureHelp.activeParameter = parameterIndex;
	return signatureHelp;
}
