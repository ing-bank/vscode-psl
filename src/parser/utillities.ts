import {IDocument, IMember} from '../parser/parser';
import {Token, Type, Position} from '../parser/tokenizer';

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
		let start: Position = {line: t.position.line, character: t.position.character}
		let end: Position = {line: t.position.line, character: t.position.character + t.value.length};
		return isBetween(start, position, end);
	});
	return {tokensOnLine, index};
}

export function dotCompletion(tokensOnLine: Token[], index: number): {reference: Token, attribute?: Token} {
	let currentToken = tokensOnLine[index];
	let reference: Token;
	let attribute: Token;
	if (currentToken.type === Type.Period && tokensOnLine[index - 1].type === Type.Alphanumeric) {
		reference = tokensOnLine[index - 1];
		return {reference}
	}
	else if (currentToken.type === Type.Alphanumeric && tokensOnLine[index - 1].type === Type.Period && tokensOnLine[index - 2].type === Type.Alphanumeric) {
		reference = tokensOnLine[index - 2];
		attribute = currentToken;
		return {reference, attribute};
	}
	return {reference: undefined};
}

function isBetween(lb: Position, t: Position, ub: Position): boolean {
	return lb.line <= t.line && lb.character <= t.line && ub.line >= t.line && lb.character >= ub.line;
}