import * as path from 'path';
import { Member, Method, ParsedDocument, parseText } from '../parser/parser';
import { Position, Token } from '../parser/tokenizer';
import * as fs from 'fs-extra';

export interface Query {
	identifier: string
	line: number
	character: number
}

export class FinderResult {
	member: Member;
	fsPath: string;
}

export class ParsedDocFinder {

	parsedDocument: ParsedDocument;
	fsPath: string;
	pslPaths: string[];

	private heirachy: string[] = [];

	constructor(parsedDocument: ParsedDocument, fsPath: string, pslPaths: string[], getWorkspaceDocumentText?: (fsPath: string) => Promise<string>) {
		this.parsedDocument = parsedDocument;
		this.fsPath = fsPath;
		this.pslPaths = pslPaths;
		if (getWorkspaceDocumentText) this.getWorkspaceDocumentText = getWorkspaceDocumentText;
	}


	async newFinder(routineName: string): Promise<ParsedDocFinder | undefined> {
		const pathsWithoutExtensions: string[] = this.pslPaths.map(pslPath => path.join(pslPath, routineName));

		for (const pathWithoutExtension of pathsWithoutExtensions) {
			for (const extension of ['.PROC', '.psl', '.PSL']) {
				const possiblePath = pathWithoutExtension + extension
				const routineText = await this.getWorkspaceDocumentText(possiblePath);
				if (!routineText) continue;
				const newPath = possiblePath;
				return new ParsedDocFinder(parseText(routineText), newPath, this.pslPaths, this.getWorkspaceDocumentText);
			}
		}
	}

	/**
	* Search the parsed document and parents for a particular member
	*/
	async searchParser(queriedToken: Token): Promise<FinderResult | undefined> {
		let activeMethod = this.findActiveMethod(queriedToken);
		if (activeMethod) {
			const variable = this.searchInMethod(activeMethod, queriedToken);
			if (variable) return { member: variable, fsPath: this.fsPath };
		}
		return this.searchInDocument(queriedToken);
	}

	private async searchInDocument(queriedToken: Token): Promise<FinderResult | undefined> {
		const foundProperty = this.parsedDocument.properties.find(p => p.id.value === queriedToken.value);
		if (foundProperty) return { member: foundProperty, fsPath: this.fsPath };

		const foundMethod = this.parsedDocument.methods.find(p => p.id.value === queriedToken.value);
		if (foundMethod) return { member: foundMethod, fsPath: this.fsPath };

		if (this.parsedDocument.extending) {
			const parentRoutineName = this.parsedDocument.extending.value;
			if (this.heirachy.indexOf(parentRoutineName) > -1) return;
			let parentFinder: ParsedDocFinder | undefined = await this.searchForParent(parentRoutineName);
			if (!parentFinder) return;
			return parentFinder.searchInDocument(queriedToken);
		}
	}

	private async searchForParent(parentRoutineName: string): Promise<ParsedDocFinder | undefined> {
		const parentFinder = await this.newFinder(parentRoutineName);
		if (!parentFinder) return;
		parentFinder.heirachy = this.heirachy.concat(this.fsPath);
		return parentFinder;
	}

	private searchInMethod(activeMethod: Method, queriedToken: Token): Member | undefined {
		for (const variable of activeMethod.declarations.reverse()) {
			if (queriedToken.position.line < variable.id.position.line) continue;
			if (queriedToken.value === variable.id.value) return variable;
		}
		for (const parameter of activeMethod.parameters) {
			if (queriedToken.value === parameter.id.value) return parameter;
		}
	}

	private findActiveMethod(queriedToken: Token): Method | undefined {
		const methods = this.parsedDocument.methods.filter(method => queriedToken.position.line >= method.id.position.line);
		if (methods) return methods[methods.length - 1];
	}

	private async getWorkspaceDocumentText(fsPath: string): Promise<string> {
		return fs.readFile(fsPath).then(b => b.toString()).catch(() => '');
	}
}


/**
 * Get the tokens on the line of position, as well as the specific index of the token at position
 */
export function searchTokens(tokens: Token[], position: Position) {
	const tokensOnLine = tokens.filter(t => t.position.line === position.line);
	if (tokensOnLine.length === 0) return undefined;
	const index = tokensOnLine.findIndex(t => {
		const start: Position = { line: t.position.line, character: t.position.character }
		const end: Position = { line: t.position.line, character: t.position.character + t.value.length };
		return isBetween(start, position, end);
	});
	return { tokensOnLine, index };
}

export function completion(tokensOnLine: Token[], index: number): { reference: Token | undefined, attribute?: Token } {
	const currentToken = tokensOnLine[index];
	let reference: Token;
	let attribute: Token;
	if (index >= 1) {
		if (currentToken.isPeriod() && tokensOnLine[index - 1].isAlphanumeric()) {
			reference = tokensOnLine[index - 1];
			return { reference }
		}
		else if (currentToken.isAlphanumeric() && tokensOnLine[index - 1].isPeriod() && tokensOnLine[index - 2].isAlphanumeric()) {
			reference = tokensOnLine[index - 2];
			attribute = currentToken;
			return { reference, attribute };
		}
	}

	return { reference: undefined };
}

export function getLineContent(parsedDoc: ParsedDocument, lineNumber: number): string {
	const tokensOnLine: Token[] = parsedDoc.tokens.filter(t => t.position.line === lineNumber);
	const values: string[] = tokensOnLine.map(t => t.value);
	const lineString: string = values.join('');
	return lineString;
}

function isBetween(lb: Position, t: Position, ub: Position): boolean {
	return lb.line <= t.line &&
		lb.character <= t.character &&
		ub.line >= t.line &&
		ub.character >= t.character;
}

interface Node {
	token: Token | undefined;
	parent?: Node;
	child?: Node;
}

export function getCallTokens(tokensOnLine: Token[], index: number): Token[] {
	const ret: Token[] = [];
	let current = getChildNode(tokensOnLine, index);
	if (!current) return ret;
	while (current.parent && current.token) {
		ret.unshift(current.token);
		current = current.parent;
	}
	if (current.token) ret.unshift(current.token);
	return ret;
}


export function getChildNode(tokensOnLine: Token[], index: number): Node | undefined {
	const currentToken = tokensOnLine[index];
	if (!currentToken) return { token: undefined };
	const previousToken = tokensOnLine[index - 1];
	if (previousToken) {
		let newIndex = -1;
		if (currentToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index));
		}
		else if (currentToken.isAlphanumeric() && previousToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index - 1));
		}

		if (newIndex >= 0) {
			let parent = getChildNode(tokensOnLine, newIndex);
			return { parent, token: currentToken };
		}

	}
	if (currentToken.isAlphanumeric()) {
		return { token: currentToken }
	}
	return undefined;
}

export function resolve(tokens: Token[]): number {
	const length = tokens.length;

	let parenCount = 0;

	if (length === 0) return -1;

	if (tokens[length - 1].isAlphanumeric()) return length - 1;

	for (let index = tokens.length - 1; index >= 0; index--) {
		const token = tokens[index];
		if (token.isCloseParen()) parenCount++;
		else if (token.isOpenParen()) parenCount--;
		if (parenCount === 0) {
			if (index > 0 && tokens[index - 1].isAlphanumeric()) return index - 1;
			else return -1;
		}
	}
	return -1;
}
