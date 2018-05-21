import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as utils from '../parser/utillities';
import * as jsonc from 'jsonc-parser';

const relativeCorePath = '.vscode/pslcls/';
const relativeProjectPath = ['dataqwik/procedure/', 'test/utgood/', 'test/stgood/'];
const relativeTablePath = 'dataqwik/table/';


const getWorkspaceDocumentText = async (fsPath: string): Promise<string> => {
	return fs.stat(fsPath).then(() => {
		return vscode.workspace.openTextDocument(fsPath).then(textDocument => textDocument.getText(), () => '');
	}).catch(() => '')
}

export class PSLHoverProvider implements vscode.HoverProvider {

	async provideHover(document: vscode.TextDocument, position: vscode.Position, cancellationToknen: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
		if (cancellationToknen.isCancellationRequested) return;
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
			corePsl: path.join(workspaceDirectory.uri.fsPath, relativeCorePath),
			projectPsl: relativeProjectPath.concat(relativeCorePath).map(pslPath => path.join(workspaceDirectory.uri.fsPath, pslPath)),
			table: path.join(workspaceDirectory.uri.fsPath, relativeTablePath),
		}
		let finder = new utils.ParsedDocFinder(parsedDoc, paths, getWorkspaceDocumentText);
		let resolvedResult = await finder.resolveResult(callTokens);
		if (resolvedResult && resolvedResult.member) return getHover(resolvedResult);
	}
}



async function getHover(result: utils.FinderResult): Promise<vscode.Hover> {
	let markdownString: vscode.MarkdownString = new vscode.MarkdownString();
	markdownString.appendCodeblock(getSignature(result.member), 'psl');
	if (result.member.memberClass === parser.MemberClass.column) {
		return getColumnDocumentation(result);
	}
	if (!result.member.documentation) return new vscode.Hover(markdownString);

	let clean = result.member.documentation.replace(/\s*(DOC)?\s*\-+/, '').replace(/\*+\s+ENDDOC/, '').trim();
	clean = clean
		.split(/\r?\n/g).map(l => l.trim()).join('\n')
		.replace(/(@\w+)/g, '*$1*')
		.replace(/(\*(@(param|publicnew|public|throws?))\*)\s+([A-Za-z\-0-9%_\.]+)/g, '$1 `$4`');
	let documentation = new vscode.MarkdownString().appendMarkdown(clean);
	return new vscode.Hover([markdownString, documentation]);
}

async function getColumnDocumentation(columnResult: utils.FinderResult): Promise<vscode.Hover> {
	let typs = {
		'T': ['String', 'column type: T (Text)'],
		'U': ['String', 'column type: U (Uppercase text)'],
		'N': ['Number', 'column type: N (Number)'],
		'$': ['Number', 'column type: $ (Currency)'],
		'L': ['Boolean', 'column type: L (Logical)'],
		'D': ['Date', 'column type: D (Date)'],
		'C': ['Number', 'column type: C (Time)'],
		'F': ['Number', 'column type: F (Frequency)'],
		'M': ['String', 'column type: M (Memo)'],
		'B': ['String', 'column type: B (Blob)'],
	}
	let text = await getWorkspaceDocumentText(columnResult.fsPath);
	let parsed = jsonc.parse(text);
	let typ = parsed.TYP;
	let doc = text.split('}')[1];

	let header = new vscode.MarkdownString().appendCodeblock(`(column) ${typs[typ][0]} ${columnResult.member.id.value}`);
	let footer = new vscode.MarkdownString().appendMarkdown(`${parsed.DES}\n\n${typs[typ][1]}\n\n${doc}`)
	return new vscode.Hover([header, footer]);
}


function getSignature(member: parser.Member): string {
	if (member.memberClass === parser.MemberClass.method) {
		let method = member as parser.Method

		let sig = `${method.modifiers.map(i => i.value).join(' ')} ${method.id.value}`;
		let argString: string = method.parameters.map((param: parser.Parameter) => `${param.types[0].value} ${param.id.value}`).join('\n , ');
		if (method.parameters.length === 0) return `${sig}(${argString})`;
		return `${sig}(\n   ${argString}\n )`
	}
	else {
		let hoverString: string = '';
		if (member.types.length === 0) hoverString = `void ${member.id.value}`;
		else if (member.types.length === 1) {
			if (member.types[0] === member.id) hoverString = `static ${member.id.value}`
			else hoverString = `${member.types[0].value} ${member.id.value}`
		}
		else {
			hoverString = `${member.types[0].value} ${member.id.value}( ${member.types.slice(1).map((t: any) => t.value).join(', ')})`
		}
		if (!hoverString) return;
		switch (member.memberClass) {
			case parser.MemberClass.declaration:
				return ' type ' + hoverString;
			case parser.MemberClass.parameter:
				return '(param) ' + hoverString;
			case parser.MemberClass.property:
				return '(property) ' + hoverString;
			case parser.MemberClass.column:
				return '(column) ' + hoverString;
			default:
				return '';
		}
	}
}