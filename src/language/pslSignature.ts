import * as vscode from "vscode";

import { FinderPaths, getFinderPaths } from "@profile-psl/psl-parser/config.js";
import * as parser from "@profile-psl/psl-parser/parser.js";
import { Position, Token } from "@profile-psl/psl-parser/tokenizer.js";
import * as utils from "@profile-psl/psl-parser/utilities.js";

import * as lang from "./lang.ts";

export class PSLSignatureHelpProvider implements vscode.SignatureHelpProvider {
	public async provideSignatureHelp(
		document: vscode.TextDocument,
		position: vscode.Position
	): Promise<vscode.SignatureHelp> {
		const workspaceDirectory = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceDirectory) return;

		const parsedDoc = parser.parseText(document.getText());
		// get tokens on line and current token
		const tokenSearchResults = ((tokens: Token[], position: Position) => {
			const tokensOnLine: Token[] = tokens.filter(t => t.position.line === position.line);
			if (tokensOnLine.length === 0) return undefined;
			const index = tokensOnLine.findIndex((t: Token) => {
				const start: Position = t.position;
				const end: Position = {
					line: t.position.line,
					character: t.position.character + t.value.length
				};
				const isBetween = (lb: Position, t: Position, ub: Position): boolean => {
					return lb.line <= t.line &&
						lb.character <= t.character &&
						ub.line >= t.line &&
						ub.character >= t.character;
				};
				return isBetween(start, position, end);
			});
			return { tokensOnLine, index };
		})(parsedDoc.tokens, position);

		if (!tokenSearchResults) return;
		const { tokensOnLine, index } = tokenSearchResults;

		const { callTokens, parameterIndex } = utils.findCallable(tokensOnLine, index);

		if (callTokens.length === 0) return;
		const paths: FinderPaths = getFinderPaths(workspaceDirectory.uri.fsPath, document.fileName);
		const finder = new utils.ParsedDocFinder(parsedDoc, paths, lang.getWorkspaceDocumentText);
		const resolvedResult = await finder.resolveResult(callTokens);
		if (!resolvedResult.member || resolvedResult.member.memberClass !== parser.MemberClass.method) return;
		if (resolvedResult) return getSignature(resolvedResult, parameterIndex, finder);
	}
}

async function getSignature(
	result: utils.FinderResult,
	parameterIndex: number,
	finder: utils.ParsedDocFinder
): Promise<vscode.SignatureHelp> {
	const langDoc = await lang.getDocumentation(result, finder);
	const markdown = langDoc.markdown;
	let code = langDoc.code;

	// TODO: (Mischa Reitsma, 2026-01-24) Create test before removing useless escape. Also: code duplication
	// eslint-disable-next-line no-useless-escape
	let clean = markdown.replace(/\s*(DOC)?\s*\-+/, "").replace(/\*+\s+ENDDOC/, "").trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join("\n")
		.replace(/(@\w+)/g, "*$1*")
		// TODO: (Mischa Reitsma, 2026-01-24) Create test before removing useless escape. Also: code duplication
		// eslint-disable-next-line no-useless-escape
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, "$1 `$4`");

	const method = result.member as parser.Method;
	const argString: string = method.parameters.map(
		(param: parser.Parameter) => `${param.types[0].value} ${param.id.value}`
	).join(", ");
	code = `${method.id.value}(${argString})`;

	const info = new vscode.SignatureInformation(code, new vscode.MarkdownString().appendMarkdown(clean));
	info.parameters = method.parameters.map(
		parameter => new vscode.ParameterInformation(`${parameter.types[0].value} ${parameter.id.value}`)
	);

	const signatureHelp = new vscode.SignatureHelp();
	signatureHelp.signatures = [info];
	signatureHelp.activeSignature = 0;
	signatureHelp.activeParameter = parameterIndex;
	return signatureHelp;
}
