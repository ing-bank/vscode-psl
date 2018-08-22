import { getTokens, Token, Type } from './tokenizer';
import * as fs from 'fs';

/**
 * Used for checking the type of Member at runtime
 */
export enum MemberClass {
	method = 1,
	parameter = 2,
	property = 3,
	declaration = 4,
	column = 5,
	table = 6,
	proc = 7,
}

/**
 * A generic type that abstracts Method, Parameter, Declaration, etc
 */
export interface Member {

	/**
	 * The Token representing the name of the member.
	 */
	id: Token

	/**
	 * An array of types. The 0 index represents the 0 node type.
	 * For trees the type of the nth node will be found at index n.
	 */
	types: Token[]

	modifiers: Token[];

	/**
	 * The member class to determine the type at runtime
	 */
	memberClass: MemberClass

	documentation?: string;
}

/**
 * Contains information about a Method
 */
export interface Method extends Member {

	/**
	 * The Token of the closing parenthesis after the declaration of all the Method's parameters.
	 */
	closeParen: Token

	/**
	 * Currently unused for Methods.
	 */
	types: Token[]

	/**
	 * All the modifiers before the Method id, like "public", "static", "void", "String", etc.
	 */
	modifiers: Token[]

	/**
	 * The parameters of the Method, each with their own typing and comment information.
	 */
	parameters: Parameter[]

	/**
	 * The "type" declarations found within the body of the method. Only the location where they are declared is referenced.
	 */
	declarations: Declaration[]

	/**
	 * The zero-based line where the Method begins
	 */
	line: number

	/**
	 * The last line of the Method, right before the start of a new Method
	 */
	endLine: number

	/**
	 * Whether the Method (label) is a batch label, such as "OPEN" or "EXEC"
	 */
	batch: boolean

	/**
	 * Next Line of a method implementation
	 */
	nextLine: number

	/**
	 * Previous Line of a method implementation
	 */
	prevLine: number;

	statements: Statement[];

}

/**
 * A PROPERTYDEF declaration
 */
export interface Property extends Member {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[]
}

/**
 * Represents a parameter, always belonging to a Method
 */
export interface Parameter extends Member {

	/**
	 * If the req keyword is used
	 */
	req: boolean

	/**
	 * If the ret keyword is used
	 */
	ret: boolean

	/**
	 * If the literal keyword is used.
	 */
	literal: boolean

	/**
	 * The contents of the comment for the parameter, i.e.
	 * ```
	 * public String name(
	 * 		String p1 // a comment
	 * 		)
	 * ```
	 */
	comment: Token
}

/**
 * A type declaration, typically found within a method.
 */
export interface Declaration extends Member {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[]
}

/**
 * An abstract syntax tree of a PSL document
 */
export interface ParsedDocument {

	/**
	 * An array of Declarations that are not contained within a method.
	 * This will be empty for valid Profile 7.6 code but is maintained for compatibility.
	 */
	declarations: Declaration[]

	/**
	 * An array of PROPERTYDEFs
	 */
	properties: Property[]

	/**
	 * An array of the methods in the document
	 */
	methods: Method[]

	/**
	 * All the tokens in the document, for reference.
	 */
	tokens: Token[]

	/**
	 * The Token that represents the parent class.
	 */
	extending: Token
}

class _Method implements Method {

	nextLine: number;
	prevLine: number;
	closeParen: Token;
	id: Token;
	types: Token[];
	modifiers: Token[];
	parameters: _Parameter[]
	declarations: Declaration[];
	line: number;
	endLine: number;
	batch: boolean;
	memberClass: MemberClass;
	documentation: string;
	statements: Statement[];

	constructor() {
		this.types = []
		this.modifiers = [];
		this.parameters = [];
		this.line = -1;
		this.declarations = [];
		this.endLine = -1;
		this.memberClass = MemberClass.method;
		this.documentation = '';
		this.statements = [];
	}
}

class _Parameter implements Parameter {
	types: Token[]
	req: boolean
	ret: boolean
	literal: boolean
	id: Token
	memberClass: MemberClass
	comment: Token
	modifiers: Token[];

	constructor() {
		this.modifiers = [];
		this.req = false
		this.ret = false
		this.literal = false
		this.memberClass = MemberClass.parameter
	}
}

const NON_METHOD_KEYWORDS = [
	'do', 'set', 'if', 'for', 'while'
]

const NON_TYPE_MODIFIERS = [
	'public', 'static', 'private',
]

export function parseText(sourceText: string): ParsedDocument {
	let parser = new Parser();
	return parser.parseDocument(sourceText);
}

export function parseFile(sourcePath: string): Promise<ParsedDocument> {
	return new Promise((resolve, reject) => {
		fs.readFile(sourcePath, (err, data) => {
			if (err) {
				reject(err);
			}
			let parser = new Parser();
			resolve(parser.parseDocument(data.toString()));
		})
	})
}

class Parser {

	private tokenizer: IterableIterator<Token>;
	private activeToken: Token;
	private methods: _Method[];
	private properties: Property[];
	private declarations: Declaration[];
	private activeMethod: _Method;
	private activeProperty: Property;
	private tokens: Token[];
	private extending: Token;

	constructor(tokenizer?: IterableIterator<Token>) {
		this.methods = [];
		this.properties = [];
		this.declarations = [];
		this.tokens = [];
		if (tokenizer) this.tokenizer = tokenizer;
	}

	private next(): boolean {
		this.activeToken = this.tokenizer.next().value;
		if (this.activeToken) this.tokens.push(this.activeToken);
		return this.activeToken !== undefined;
	}

	parseDocument(documentText: string): ParsedDocument {
		this.tokenizer = getTokens(documentText);
		while (this.next()) {
			if (this.activeToken.isAlphanumeric() || this.activeToken.isMinusSign()) {
				let method = this.parseMethod();
				if (!method) continue;
				this.methods.push(method);
				this.activeMethod = method;
			}
			else if (this.activeToken.isTab() || this.activeToken.isSpace()) {
				let lineNumber = this.activeToken.position.line;
				let tokenBuffer = this.loadTokenBuffer();
				let propertyDef = this.lookForPropertyDef(tokenBuffer);
				if (propertyDef) {
					if (propertyDef.id) this.properties.push(propertyDef);
					this.activeProperty = propertyDef;
					continue;
				}
				let typeDec = this.lookForTypeDeclaration(tokenBuffer);
				if (typeDec.length > 0) {
					let activeDeclarations = this.activeMethod ? this.activeMethod.declarations : this.declarations;
					for (let dec of typeDec) activeDeclarations.push(dec);
					continue;
				}
				let extending = this.checkForExtends(tokenBuffer);
				if (extending) this.extending = extending;

				let statement = parseStatement(tokenBuffer);
				if (statement && this.activeMethod) this.activeMethod.statements.push(statement);
				if (this.activeProperty && this.activeProperty.id.position.line + 1 === lineNumber) {
					let documentation = this.checkForDocumentation(tokenBuffer);
					if (documentation) this.activeProperty.documentation = documentation;
				}
				else if (this.activeMethod && this.activeMethod.nextLine === lineNumber) {
					let documentation = this.checkForDocumentation(tokenBuffer);
					if (documentation) this.activeMethod.documentation = documentation;
				}
			}
			else if (this.activeToken.isNewLine()) continue;
			else this.throwAwayTokensTil(Type.NewLine);
		}
		return {
			declarations: this.declarations,
			properties: this.properties,
			methods: this.methods,
			tokens: this.tokens,
			extending: this.extending
		}
	}

	private checkForDocumentation(tokenBuffer: Token[]): string {
		let i = 0;
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			if (token.isBlockCommentInit() && tokenBuffer[i + 1] && tokenBuffer[i + 1].isBlockComment()) {
				return tokenBuffer[i + 1].value;
			}
			return '';
		}
	}

	private lookForTypeDeclaration(tokenBuffer: Token[]): Declaration[] | undefined {
		let i = 0;
		let tokens: Token[] = [];
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			if (token.isAlphanumeric() && token.value === 'type') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					let loadToken = tokenBuffer[j];
					if (loadToken.isSpace() || loadToken.isTab()) continue;
					// if (loadToken.isEqualSign()) break;
					tokens.push(loadToken);
				}
			}
			else if (token.isAlphanumeric() && token.value === 'catch') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					let loadToken = tokenBuffer[j];
					if (loadToken.isSpace() || loadToken.isTab()) continue;
					// if (loadToken.isEqualSign()) break;
					tokens.push(new Token(Type.Alphanumeric, 'Error', { character: 0, line: 0 }));
					tokens.push(loadToken);
					break;
				}
			}
			break;
		}
		let memberClass = MemberClass.declaration
		let declarations: Declaration[] = [];
		let type;
		let tokenIndex = 0;
		let id;
		let hasType;
		let modifiers: Token[] = [];
		while (tokenIndex < tokens.length) {
			let token = tokens[tokenIndex];
			tokenIndex++;
			if (this.isDeclarationKeyword(token)) {
				modifiers.push(token);
				continue;
			};
			if (!hasType) {
				if (token.type !== Type.Alphanumeric) break;
				if (token.value === 'static') hasType = true;
				else {
					type = token;
					hasType = true;
				}
				continue;
			}
			else if (token.isAlphanumeric()) {
				id = token;
				if (hasType && !type) type = token;
				// declarations.push({types: [type], identifier});
			}
			else if (token.isEqualSign()) {
				tokenIndex = this.skipToNextDeclaration(tokens, tokenIndex)
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
			}
			else if (token.isOpenParen()) {
				let types = [];
				let myIdentifier = tokens[tokenIndex - 2];
				while (tokenIndex < tokens.length) {
					let token = tokens[tokenIndex];
					tokenIndex++;
					if (token.isOpenParen()) continue;
					else if (token.isAlphanumeric()) {
						types.push(token)
					}
					else if (token.isComma()) {
						continue;
					}
					else if (token.isCloseParen()) {
						if (type) declarations.push({ id: myIdentifier, types: [type].concat(types), memberClass, modifiers })
						id = undefined;
						break;
					}
				}
			}
			// Cheating!!
			// else if (token.isPercentSign()) continue;
			else if (token.isComma()) {
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
				continue;
			}
			else if (token.value === '\r') continue;
			else if (token.isBlockComment()) continue;
			else if (token.isBlockCommentInit()) continue;
			else if (token.isBlockCommentTerm()) continue;
			else if (token.isNewLine()) {
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
				break
			}
			else break;
		}
		if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
		return declarations;
	}

	private checkForExtends(tokenBuffer: Token[]): Token {
		let i = 0;
		let classDef = false;
		let extending = false;
		let equals = false;
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			else if (token.isNumberSign() && !classDef) {
				let nextToken;
				try {
					nextToken = tokenBuffer[i + 1];
				}
				catch (e) {
					return;
				}
				if (nextToken.value === 'CLASSDEF') {
					classDef = true;
					i += 2;
				}
				else break;
			}
			else if (token.value === 'extends' && !extending) {
				extending = true;
				i++
			}
			else if (token.isEqualSign() && !equals) {
				equals = true;
				i++
			}
			else if (token.isAlphanumeric() && classDef && extending && equals) {
				return token;
			}
			else {
				i++;
			}
		}
		return;
	}

	private skipToNextDeclaration(identifiers: Token[], tokenIndex: number): number {
		let parenStack = 0;
		while (tokenIndex < identifiers.length) {
			let token = identifiers[tokenIndex]
			tokenIndex++;
			if (token.isOpenParen()) {
				parenStack++;
			}
			else if (token.isCloseParen()) {
				parenStack--;
			}
			else if (token.isComma() && parenStack === 0) {
				break;
			}
		}
		return tokenIndex;
	}

	private isDeclarationKeyword(token: Token) {
		if (token.type !== Type.Alphanumeric) return false;
		let keywords = ['public', 'private', 'new', 'literal']
		return keywords.indexOf(token.value) !== -1;
	}

	private throwAwayTokensTil(type: Type) {
		do { } while (this.next() && this.activeToken.type !== type)
	}

	private loadTokenBuffer() {
		let tokenBuffer = []
		while (this.next() && this.activeToken.type !== Type.NewLine) {
			tokenBuffer.push(this.activeToken);
		}
		return tokenBuffer;

	}

	private lookForPropertyDef(tokenBuffer: Token[]): Property | undefined {
		let i = 0;
		// TODO better loop
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			if (token.isNumberSign()) {
				try {
					token = tokenBuffer[i + 1];
				}
				catch (e) {
					return;
				}
				if (token.value === 'PROPERTYDEF') {
					let tokens = tokenBuffer.filter(t => {
						if (t.isNumberSign()) return false;
						if (t.value === 'PROPERTYDEF') return false;
						return t.type !== Type.Space && t.type !== Type.Tab
					}
					)
					let classTypes: Token[] = [];
					let classIndex = tokens.findIndex(t => t.value === 'class');
					if (tokens[classIndex + 1] && tokens[classIndex + 1].value === '=' && tokens[classIndex + 2] && tokens[classIndex + 2].isAlphanumeric()) {
						classTypes.push(tokens[classIndex + 2]);
					}
					return { id: tokens[0], modifiers: tokens.slice(1), types: classTypes, memberClass: MemberClass.property }

				}
				else {
					break;
				}
			}
			else {
				break;
			}
		}
		return;

	}

	private parseMethod(): _Method | undefined {
		let batchLabel = false;
		let method: _Method = new _Method();
		do {
			if (!this.activeToken) continue;
			if (this.activeToken.isTab() || this.activeToken.isSpace()) continue;
			else if (this.activeToken.isNewLine()) break;
			else if (this.activeToken.isOpenParen()) {
				let processed = this.processParameters(method);
				if (!processed) return undefined;
				method.parameters = processed;
				break;
			}
			else if (this.activeToken.isAlphanumeric() || this.activeToken.isNumeric()) {
				if (batchLabel) {
					method.modifiers.push(this.activeToken)
					method.batch = true;
					break;
				}
				if (method.line === -1) {
					method.line = this.activeToken.position.line;
					method.prevLine = this.activeToken.position.line - 1;
					method.nextLine = this.activeToken.position.line + 1;
				}
				method.modifiers.push(this.activeToken);
			}
			else if (this.activeToken.isMinusSign()) {
				batchLabel = true;
				continue;
			}
			else if (this.activeToken.isLineCommentInit() || this.activeToken.isLineComment() || this.activeToken.isBlockCommentInit() || this.activeToken.isBlockComment() || this.activeToken.isBlockCommentTerm()) {
				continue;
			}
			else if (this.activeToken.value === '\r') continue;
			else if (this.activeToken.isCloseParen()) {
				if (!method.closeParen) {
					method.closeParen = this.activeToken;
					method.nextLine = this.activeToken.position.line + 1;
				}
			}
			else {
				this.throwAwayTokensTil(Type.NewLine);
				if (method.modifiers.length > 1) {
					break;
				}
				return undefined
			}
		} while (this.next());

		return this.finalizeMethod(method);
	}

	private finalizeMethod(method: _Method) {
		for (let keyword of NON_METHOD_KEYWORDS) {
			let index = method.modifiers.map(i => i.value).indexOf(keyword)
			if (index > -1 && index < method.modifiers.length - 1) {
				method.modifiers = [method.modifiers[0]];
				method.parameters = [];
			}
		}
		// better way...
		method.id = method.modifiers.pop();
		if (this.activeMethod) {
			this.activeMethod.endLine = method.id.position.line - 1;
		}
		const lastModifier = method.modifiers[method.modifiers.length - 1];
		if (lastModifier && NON_TYPE_MODIFIERS.indexOf(lastModifier.value) < 0) {
			method.types = [lastModifier];
		}
		this.activeMethod = method;
		return method;
	}

	private processParameters(method: _Method): _Parameter[] | undefined {

		let args: _Parameter[] = [];
		let param: _Parameter | undefined;
		let open = false;
		while (this.next()) {
			if (this.activeToken.isTab() || this.activeToken.isSpace() || this.activeToken.isNewLine()) continue;
			else if (this.activeToken.isOpenParen()) {
				open = true;
				if (!param) return undefined;
				if (param.types.length === 1 && !param.id) {
					param.id = param.types[0];
					param.types[0] = this.getDummy();
				}
				let objectArgs = this.processObjectArgs();
				if (!objectArgs) return undefined;
				param.types = param.types.concat(objectArgs);
				continue;
			}
			else if (this.activeToken.isCloseParen()) {
				open = false;
				method.closeParen = this.activeToken;
				method.nextLine = this.activeToken.position.line + 1;
				if (!param) break;
				if (param.types.length === 1 && !param.id) {
					param.id = param.types[0]
					param.types[0] = this.getDummy();
				}
				args.push(param);
				break;
			}
			else if (this.activeToken.isAlphanumeric()) {
				if (!param) param = new _Parameter();
				// let value = this.activeToken.value;
				if (this.activeToken.value === 'req') {
					param.modifiers.push(this.activeToken);
					param.req = true;
				}
				else if (this.activeToken.value === 'ret') {
					param.modifiers.push(this.activeToken);
					param.ret = true;
				}
				else if (this.activeToken.value === 'literal') {
					param.modifiers.push(this.activeToken);
					param.literal = true;
				}
				else if (!param.types) param.types = [this.activeToken];
				else {
					param.id = this.activeToken;
				}
			}
			else if (this.activeToken.isLineComment()) {
				if (param) {
					param.comment = this.activeToken
				}
				else if (args.length >= 1) {
					args[args.length - 1].comment = this.activeToken;
				}
			}
			else if (this.activeToken.isComma()) {
				if (!param) return undefined;
				if (param.types.length === 1 && !param.id) {
					param.id = param.types[0]
					param.types[0] = this.getDummy();
				}
				args.push(param)
				param = undefined;
			}
		}
		if (open) return undefined;
		return args;
	}

	private processObjectArgs(): Token[] | undefined {
		let types: Token[] = [];
		let found = false;
		while (this.next()) {
			let dummy = this.getDummy();
			if (this.activeToken.isTab() || this.activeToken.isSpace()) continue;
			else if (this.activeToken.isCloseParen()) {
				if (types.length === 0) types.push(dummy);
				return types;
			}
			else if (this.activeToken.isAlphanumeric()) {
				if (!found) {
					types.push(this.activeToken);
					found = true;
				}
				else return undefined;
			}
			else if (this.activeToken.isComma()) {
				if (!found) {
					if (types.length === 0) {
						types.push(dummy);
					}
					types.push(dummy);
				}
				found = false;
				continue;
			}
		}
		return undefined;
	}

	private getDummy() {
		return new Token(Type.Undefined, '', this.activeToken.position);
	}
}

export interface Statement {
	action: Token
	expression: Node
}

export interface Node {
	data: Value | Token
	left?: Node
	right?: Node
}

export interface Value {
	id: Token
	args?: Value[]
	child?: Value
}

export function parseStatement(tokenBuffer: Token[]): Statement | undefined {
	let tokenIndex = 0;
	let token = tokenBuffer[tokenIndex];
	while (token && token.isWhiteSpace()) {
		tokenIndex++;
		token = tokenBuffer[tokenIndex];
	}
	if (!token) return;
	switch (token.value) {
		case "do":
			let expression = parseExpression(tokenBuffer.slice(tokenIndex + 2));
			if (expression) return { action: token, expression };
			break;
		default:
			break;
	}
}

export function parseExpression(tokenArray: Token[]): Node {
	let parsed = parseValue(tokenArray)
	if (parsed) return { data: parsed.value };

}

export function parseValue(tokenArray: Token[]): { value: Value | undefined, rest: Token[] } {
	let token0 = tokenArray[0];
	if (token0.isDoubleQuotes()) {
		let id = tokenArray[1]
		let endQuote = tokenArray[2];
		if (id.isString() && endQuote.isDoubleQuotes()) {
			return { value: { id }, rest: tokenArray.slice(3) }
		}
	}
	if (!token0 || !(token0.isAlphanumeric() || token0.isString() || token0.isNumeric())) return;
	const id = token0;
	let args: Value[] = [];
	let child: Value;
	let next = tokenArray[1];
	let rest = tokenArray.slice(1);
	if (next && next.isOpenParen() && !args.length) {
		let parsed = parseArgs(rest);
		args = parsed.args;
		rest = parsed.rest;
		next = rest[0];
	}

	if (next && next.isPeriod()) {
		let parsed = parseValue(rest.slice(1));
		if (parsed) {
			child = parsed.value;
			rest = parsed.rest;
		}
	}

	return { value: { id, args, child }, rest };

}

export function parseArgs(tokenArray: Token[]): { args: Value[], rest: Token[] } {
	let args: Value[] = [];
	let i;
	for (i = 0; i < tokenArray.length; i++) {
		const token = tokenArray[i];
		if (i === 0 && token.isOpenParen()) continue;
		if (token.isWhiteSpace()) continue;
		if (token.isComma()) continue;
		else if (token.isCloseParen()) {
			i++;
			break;
		}
		else if (token) {
			let parsed = parseValue(tokenArray.slice(i));
			if (!parsed) break;
			i = tokenArray.length - parsed.rest.length;
			if (parsed.value) args.push(parsed.value);
			else break;
		}
	}
	return { args, rest: tokenArray.slice(i) };
}
