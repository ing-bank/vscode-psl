import * as fs from 'fs';
import { Statement, StatementParser } from './statementParser';
import { getTokens, Token, Type } from './tokenizer';
import { getLineAfter } from './utilities';

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
	id: Token;

	/**
	 * An array of types. The 0 index represents the 0 node type.
	 * For trees the type of the nth node will be found at index n.
	 */
	types: Token[];

	modifiers: Token[];

	/**
	 * The member class to determine the type at runtime
	 */
	memberClass: MemberClass;

	documentation?: string;
}

/**
 * Contains information about a Method
 */
export interface Method extends Member {

	/**
	 * The Token of the closing parenthesis after the declaration of all the Method's parameters.
	 */
	closeParen: Token;

	/**
	 * Currently unused for Methods.
	 */
	types: Token[];

	/**
	 * All the modifiers before the Method id, like "public", "static", "void", "String", etc.
	 */
	modifiers: Token[];

	/**
	 * The parameters of the Method, each with their own typing and comment information.
	 */
	parameters: Parameter[];

	/**
	 * The "type" declarations found within the body of the method.
	 * Only the location where they are declared is referenced.
	 */
	declarations: Declaration[];

	/**
	 * The zero-based line where the Method begins
	 */
	line: number;

	/**
	 * The last line of the Method, right before the start of a new Method
	 */
	endLine: number;

	/**
	 * Whether the Method (label) is a batch label, such as "OPEN" or "EXEC"
	 */
	batch: boolean;

	statements: Statement[];

}

/**
 * A PROPERTYDEF declaration
 */
export interface Property extends Member {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[];
}

/**
 * Represents a parameter, always belonging to a Method
 */
export interface Parameter extends Member {

	/**
	 * If the req keyword is used
	 */
	req: boolean;

	/**
	 * If the ret keyword is used
	 */
	ret: boolean;

	/**
	 * If the literal keyword is used.
	 */
	literal: boolean;

	/**
	 * The contents of the comment for the parameter, i.e.
	 * ```
	 * public String name(
	 * 		String p1 // a comment
	 * 		)
	 * ```
	 */
	comment: Token;
}

/**
 * A type declaration, typically found within a method.
 */
export interface Declaration extends Member {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[];
}

/**
 * An abstract syntax tree of a PSL document
 */
export interface ParsedDocument {

	/**
	 * An array of Declarations that are not contained within a method.
	 * This will be empty for valid Profile 7.6 code but is maintained for compatibility.
	 */
	declarations: Declaration[];

	/**
	 * An array of PROPERTYDEFs
	 */
	properties: Property[];

	/**
	 * An array of the methods in the document
	 */
	methods: Method[];

	/**
	 * All the tokens in the document, for reference.
	 */
	tokens: Token[];

	/**
	 * The Token that represents the parent class.
	 */
	extending: Token;

	/**
	 * The Token that represents the PSL package.
	 */
	pslPackage: string;

	/**
	 * The tokens corresponding to line and block comments.
	 */
	comments: Token[];
}

// tslint:disable-next-line:class-name
class _Method implements Method {

	closeParen: Token;
	id: Token;
	types: Token[];
	modifiers: Token[];
	parameters: _Parameter[];
	declarations: Declaration[];
	line: number;
	endLine: number;
	batch: boolean;
	memberClass: MemberClass;
	documentation: string;
	statements: Statement[];

	constructor() {
		this.types = [];
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

// tslint:disable-next-line:class-name
class _Parameter implements Parameter {
	types: Token[];
	req: boolean;
	ret: boolean;
	literal: boolean;
	id: Token;
	memberClass: MemberClass;
	comment: Token;
	modifiers: Token[];

	constructor() {
		this.modifiers = [];
		this.req = false;
		this.ret = false;
		this.literal = false;
		this.memberClass = MemberClass.parameter;
	}
}

const NON_METHOD_KEYWORDS = [
	'do', 'd', 'set', 's', 'if', 'i', 'for', 'f', 'while', 'w',
];

export const NON_TYPE_MODIFIERS = [
	'public', 'static', 'private',
];

export function parseText(sourceText: string): ParsedDocument {
	const parser = new Parser();
	return parser.parseDocument(sourceText);
}

export function parseFile(sourcePath: string): Promise<ParsedDocument> {
	return new Promise((resolve, reject) => {
		fs.readFile(sourcePath, (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				const parser = new Parser();
				resolve(parser.parseDocument(data.toString()));
			}
		});
	});
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
	private pslPackage: string;
	private comments: Token[];

	constructor(tokenizer?: IterableIterator<Token>) {
		this.methods = [];
		this.properties = [];
		this.declarations = [];
		this.tokens = [];
		this.comments = [];
		if (tokenizer) this.tokenizer = tokenizer;
	}

	parseDocument(documentText: string): ParsedDocument {
		this.tokenizer = getTokens(documentText);
		while (this.next()) {
			if (this.activeToken.isAlphanumeric() || this.activeToken.isMinusSign()) {
				const method = this.parseMethod();
				if (!method) continue;
				this.methods.push(method);
				this.activeMethod = method;
			}
			else if (this.activeToken.isTab() || this.activeToken.isSpace()) {
				const lineNumber = this.activeToken.position.line;
				const tokenBuffer = this.loadTokenBuffer();
				const propertyDef = this.lookForPropertyDef(tokenBuffer);
				if (propertyDef) {
					if (propertyDef.id) this.properties.push(propertyDef);
					this.activeProperty = propertyDef;
					continue;
				}
				const typeDec = this.lookForTypeDeclaration(tokenBuffer);
				if (typeDec.length > 0) {
					const activeDeclarations = this.activeMethod ? this.activeMethod.declarations : this.declarations;
					for (const dec of typeDec) activeDeclarations.push(dec);
					continue;
				}
				const extending = this.checkForExtends(tokenBuffer);
				if (extending) this.extending = extending;
				const pslPackage = this.checkForPSLPackage(tokenBuffer);
				if (pslPackage) this.pslPackage = pslPackage;
				if (this.activeMethod && this.activeMethod.batch && this.activeMethod.id.value === 'REVHIST') {
					continue;
				}
				const statements = this.parseStatementsOnLine(tokenBuffer);
				if (statements && this.activeMethod) this.activeMethod.statements = this.activeMethod.statements.concat(statements);
				if (this.activeProperty && this.activeProperty.id.position.line + 1 === lineNumber) {
					const documentation = this.checkForDocumentation(tokenBuffer);
					if (documentation) this.activeProperty.documentation = documentation;
				}
				else if (this.activeMethod && getLineAfter(this.activeMethod) === lineNumber) {
					const documentation = this.checkForDocumentation(tokenBuffer);
					if (documentation) this.activeMethod.documentation = documentation;
				}
			}
			else if (this.activeToken.isNewLine()) continue;
			else this.throwAwayTokensTil(Type.NewLine);
		}
		return {
			comments: this.comments,
			declarations: this.declarations,
			extending: this.extending,
			pslPackage: this.pslPackage,
			methods: this.methods,
			properties: this.properties,
			tokens: this.tokens,
		};
	}

	private next(): boolean {
		this.activeToken = this.tokenizer.next().value;
		if (this.activeToken) {
			this.tokens.push(this.activeToken);
			if (this.activeToken.isLineComment() || this.activeToken.isBlockComment()) {
				this.comments.push(this.activeToken);
			}
		}
		return this.activeToken !== undefined;
	}

	private checkForDocumentation(tokenBuffer: Token[]): string {
		let i = 0;
		while (i < tokenBuffer.length) {
			const token = tokenBuffer[i];
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
		const tokens: Token[] = [];
		while (i < tokenBuffer.length) {
			const token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			if (token.isAlphanumeric() && token.value === 'type') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					const loadToken = tokenBuffer[j];
					if (loadToken.isSpace() || loadToken.isTab()) continue;
					// if (loadToken.isEqualSign()) break;
					tokens.push(loadToken);
				}
			}
			else if (token.isAlphanumeric() && token.value === 'catch') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					const loadToken = tokenBuffer[j];
					if (loadToken.isSpace() || loadToken.isTab()) continue;
					// if (loadToken.isEqualSign()) break;
					tokens.push(new Token(Type.Alphanumeric, 'Error', { character: 0, line: 0 }));
					tokens.push(loadToken);
					break;
				}
			}
			break;
		}
		const memberClass = MemberClass.declaration;
		const declarations: Declaration[] = [];
		let type;
		let tokenIndex = 0;
		let id;
		let hasType;
		const modifiers: Token[] = [];
		while (tokenIndex < tokens.length) {
			const token = tokens[tokenIndex];
			tokenIndex++;
			if (this.isDeclarationKeyword(token)) {
				modifiers.push(token);
				continue;
			}
			if (!hasType) {
				if (token.type !== Type.Alphanumeric) break;
				if (token.value === 'static') {
					modifiers.push(token);
					hasType = true;
				}
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
				tokenIndex = this.skipToNextDeclaration(tokens, tokenIndex);
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
			}
			else if (token.isOpenParen()) {
				const types = [];
				const myIdentifier = tokens[tokenIndex - 2];
				while (tokenIndex < tokens.length) {
					const arrayTypeToken = tokens[tokenIndex];
					tokenIndex++;
					if (arrayTypeToken.isOpenParen()) continue;
					else if (arrayTypeToken.isAlphanumeric()) {
						types.push(arrayTypeToken);
					}
					else if (arrayTypeToken.isComma()) {
						continue;
					}
					else if (arrayTypeToken.isCloseParen()) {
						if (type) declarations.push({ id: myIdentifier, types: [type].concat(types), memberClass, modifiers });
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
				break;
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
			const token = tokenBuffer[i];
			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			else if (token.isNumberSign() && !classDef) {
				const nextToken = tokenBuffer[i + 1];
				if (!nextToken) return;
				if (nextToken.value === 'CLASSDEF') {
					classDef = true;
					i += 2;
				}
				else break;
			}
			else if (token.value === 'extends' && !extending) {
				extending = true;
				i++;
			}
			else if (token.isEqualSign() && !equals) {
				equals = true;
				i++;
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

	private checkForPSLPackage(tokenBuffer: Token[]): string {
		let i = 0;
		let foundPackageToken = false;

		let fullPackage = '';

		while (i < tokenBuffer.length) {
			const token = tokenBuffer[i];

			if (token.isTab() || token.isSpace()) {
				i++;
				continue;
			}
			else if (token.isNumberSign() && !foundPackageToken) {
				const nextToken = tokenBuffer[i + 1];
				if (!nextToken) return;
				if (nextToken.value === 'PACKAGE') {
					foundPackageToken = true;
					i += 2;
				}
				else break;
			}
			else if (token.isAlphanumeric() && foundPackageToken) {
				// TODO: Maybe this should return an ordered list of tokens?
				if (fullPackage === '') {
					fullPackage = token.value;
				}
				else {
					fullPackage += ('.' + token.value);
				}
				i++;
			}
			else {
				i++;
			}
		}
		if (fullPackage !== '') {
			return fullPackage;
		}
		return;
	}

	private skipToNextDeclaration(identifiers: Token[], tokenIndex: number): number {
		let parenStack = 0;
		while (tokenIndex < identifiers.length) {
			const token = identifiers[tokenIndex];
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
		const keywords = ['public', 'private', 'new', 'literal'];
		return keywords.indexOf(token.value) !== -1;
	}

	private throwAwayTokensTil(type: Type) {
		while (this.next() && this.activeToken.type !== type);
	}

	private loadTokenBuffer() {
		const tokenBuffer = [];
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
				token = tokenBuffer[i + 1];
				if (token && token.value === 'PROPERTYDEF') {
					const tokens = tokenBuffer.filter(t => {
						if (t.isNumberSign()) return false;
						if (t.value === 'PROPERTYDEF') return false;
						return t.type !== Type.Space && t.type !== Type.Tab;
					},
					);
					const classTypes: Token[] = [];
					const classIndex = tokens.findIndex(t => t.value === 'class');
					if (
						tokens[classIndex + 1]
						&& tokens[classIndex + 1].value === '='
						&& tokens[classIndex + 2]
						&& tokens[classIndex + 2].isAlphanumeric()
					) {
						classTypes.push(tokens[classIndex + 2]);
					}
					return {
						id: tokens[0],
						memberClass: MemberClass.property,
						modifiers: this.findPropertyModifiers(tokens.slice(1)),
						types: classTypes,
					};

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

	private findPropertyModifiers(tokens: Token[]) {
		return tokens.filter(t => {
			return t.value === 'private' || t.value === 'literal' || t.value === 'public';
		});
	}

	private parseMethod(): _Method | undefined {
		let batchLabel = false;
		const method: _Method = new _Method();
		do {
			if (!this.activeToken) continue;
			if (this.activeToken.isTab() || this.activeToken.isSpace()) continue;
			else if (this.activeToken.isNewLine()) break;
			else if (this.activeToken.isOpenParen()) {
				const processed = this.processParameters(method);
				if (!processed) return undefined;
				method.parameters = processed;
				break;
			}
			else if (this.activeToken.isAlphanumeric() || this.activeToken.isNumeric()) {
				if (batchLabel) {
					method.modifiers.push(this.activeToken);
					method.batch = true;
					break;
				}
				if (method.line === -1) {
					method.line = this.activeToken.position.line;
				}
				method.modifiers.push(this.activeToken);
			}
			else if (this.activeToken.isMinusSign()) {
				batchLabel = true;
				continue;
			}
			else if (
				this.activeToken.isLineCommentInit()
				|| this.activeToken.isLineComment()
				|| this.activeToken.isBlockCommentInit()
				|| this.activeToken.isBlockComment()
				|| this.activeToken.isBlockCommentTerm()
			) {
				continue;
			}
			else if (this.activeToken.value === '\r') continue;
			else if (this.activeToken.isCloseParen()) {
				if (!method.closeParen) {
					method.closeParen = this.activeToken;
				}
			}
			else {
				this.throwAwayTokensTil(Type.NewLine);
				if (method.modifiers.length > 1) {
					break;
				}
				return undefined;
			}
		} while (this.next());

		return this.finalizeMethod(method);
	}

	private finalizeMethod(method: _Method) {
		for (const keyword of NON_METHOD_KEYWORDS) {
			const index = method.modifiers.map(i => i.value.toLowerCase()).indexOf(keyword.toLowerCase());
			if (index > -1 && index <= method.modifiers.length - 1) {
				method.modifiers = [method.modifiers[0]];
				method.parameters = [];
				break;
			}
		}
		// better way...
		method.id = method.modifiers.pop();
		if (this.activeMethod) {
			this.activeMethod.endLine = method.id.position.line - 1;
		}
		const lastModifier = method.modifiers[method.modifiers.length - 1];
		if (lastModifier && NON_TYPE_MODIFIERS.indexOf(lastModifier.value) < 0) {
			method.types = [method.modifiers.pop()];
		}
		this.activeMethod = method;
		return method;
	}

	private processParameters(method: _Method): _Parameter[] | undefined {

		const args: _Parameter[] = [];
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
				const objectArgs = this.processObjectArgs();
				if (!objectArgs) return undefined;
				param.types = param.types.concat(objectArgs);
				continue;
			}
			else if (this.activeToken.isCloseParen()) {
				open = false;
				method.closeParen = this.activeToken;
				if (!param) break;
				if (param.types.length === 1 && !param.id) {
					param.id = param.types[0];
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
					param.comment = this.activeToken;
				}
				else if (args.length >= 1) {
					args[args.length - 1].comment = this.activeToken;
				}
			}
			else if (this.activeToken.isComma()) {
				if (!param) return undefined;
				if (param.types.length === 1 && !param.id) {
					param.id = param.types[0];
					param.types[0] = this.getDummy();
				}
				args.push(param);
				param = undefined;
			}
		}
		if (open) return undefined;
		return args;
	}

	private processObjectArgs(): Token[] | undefined {
		const types: Token[] = [];
		let found = false;
		while (this.next()) {
			const dummy = this.getDummy();
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

	private parseStatementsOnLine(tokenBuffer: Token[]): Statement[] {
		const statementParser = new StatementParser(tokenBuffer);
		try {
			return statementParser.parseLine();
		}
		catch {
			return [];
		}
	}

	private getDummy() {
		return new Token(Type.Undefined, '', this.activeToken.position);
	}
}
