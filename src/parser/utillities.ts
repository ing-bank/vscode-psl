import { IDocument, IMember } from '../parser/parser';
import { Token, Position } from '../parser/tokenizer';

export interface Query {
	identifier: string
	line: number
	character: number
}

/**
 * Search the parsed document for a particular member
 */
export function searchParser(parsedDoc: IDocument, token: Token): IMember {
	let line = token.position.line;
	let identifier = token.value;
	let methods = parsedDoc.methods.filter(method => line >= method.id.position.line)
	if (methods.length > 0) {
		let method = methods[methods.length - 1];
		for (let variable of method.declarations.reverse()) {
			if (line < variable.id.position.line) continue;
			if (identifier === variable.id.value) return variable;
		}
		for (let otherMethod of parsedDoc.methods) {
			let id = otherMethod.id;
			if (id.value === identifier) return otherMethod;
		}
		for (let variable of method.parameters) {
			if (identifier === variable.id.value) return variable;
		}
	}
	return parsedDoc.properties.find(property => property.id.value === identifier);
}


/**
 * Get the tokens on the line of position, as well as the specific index of the token at position
 */
export function searchTokens(tokens: Token[], position: Position) {
	let tokensOnLine = tokens.filter(t => t.position.line === position.line);
	if (tokensOnLine.length === 0) return undefined;
	let index = tokensOnLine.findIndex(t => {
		let start: Position = { line: t.position.line, character: t.position.character }
		let end: Position = { line: t.position.line, character: t.position.character + t.value.length };
		return isBetween(start, position, end);
	});
	return { tokensOnLine, index };
}

export function completion(tokensOnLine: Token[], index: number): { reference: Token, attribute?: Token } {
	let currentToken = tokensOnLine[index];
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

export function getLineContent(parsedDoc: IDocument, lineNumber: number): string {
	let tokensOnLine: Token[] = parsedDoc.tokens.filter(t => t.position.line === lineNumber);
	let values: string[] = tokensOnLine.map(t => t.value);
	let lineString: string = values.join('');
	return lineString;
}

function isBetween(lb: Position, t: Position, ub: Position): boolean {
	return lb.line <= t.line &&
		lb.character <= t.character &&
		ub.line >= t.line &&
		ub.character >= t.character;
}

interface Node {
	token: Token;
	parent?: Node;
}


export function parseStatement(tokensOnLine: Token[], index: number): Node {
	let currentToken = tokensOnLine[index];
	if (!currentToken) return { token: undefined };
	let previousToken = tokensOnLine[index - 1];
	if (previousToken) {
		let newIndex = -1;
		if (currentToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index));
		}
		else if (currentToken.isAlphanumeric() && previousToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index - 1));
		}

		if (newIndex >= 0) {
			let parent = parseStatement(tokensOnLine, newIndex);
			return { parent, token: currentToken };
		}

	}
	if (currentToken.isAlphanumeric()) {
		return { token: currentToken }
	}
	return undefined;
}

export function resolve(tokens: Token[]): number {
	let parenCount = 0;
	let length = tokens.length;

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