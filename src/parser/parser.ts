import { getTokens, Token, Type } from './tokenizer';
import * as fs from 'fs';

/**
 * Used for checking the type of Member at runtime
 */
export enum MemberClass {
	method = 1,
	parameter = 2,
	property = 3,
	declaration = 4
}

/**
 * A generic type that abstracts Method, Parameter, Declaration, etc
 */
export interface IMember {

	/**
	 * The Token representing the name of the member.
	 */
	id: Token

	/**
	 * An array of types. The 0 index represents the 0 node type.
	 * For trees the type of the nth node will be found at index n.
	 */
	types: Token[]

	/**
	 * The memeber class to determine the type at runtime
	 */
	memberClass: MemberClass
}

/**
 * Contains information about a Method
 */
export interface IMethod extends IMember {

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
	 * The "type" delcarations found within the body of the method. Only the location where they are declared is referenced.
	 */
	declarations: IDeclaration[]

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

}

/**
 * A PROPERTYDEF declaration
 */
export interface IProperty extends IMember {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[]
}

/**
 * Represents a parameter, always belonging to a Method
 */
export interface IParameter extends IMember {

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
export interface IDeclaration extends IMember {

	/**
	 * The other Tokens in the declaration, currently unparsed.
	 */
	modifiers: Token[]
}

/**
 * An abstract syntax tree of a PSL document
 */
export interface IDocument {

	/**
	 * An array of Declarations that are not contained within a method.
	 * This will be empty for valid Profile 7.6 code but is maintained for compatability.
	 */
	declarations: IDeclaration[]

	/**
	 * An array of PROPERTYDEFs
	 */
	properties: IProperty[]

	/**
	 * An array of the methods in the document
	 */
	methods: IMethod[]

	/**
	 * All the tokens in the document, for reference.
	 */
	tokens: Token[]

	/**
	 * The Token that represents the parent class.
	 */
	extending: Token
}

class Method implements IMethod {

	closeParen: Token;
	id: Token;
	types: Token[];
	modifiers: Token[];
	parameters: Parameter[]
	declarations: IDeclaration[];
	line: number;
	endLine: number;
	batch: boolean;
	memberClass: MemberClass;

	constructor() {
		this.types = []
		this.modifiers = [];
		this.parameters = [];
		this.line = -1;
		this.declarations = [];
		this.endLine = -1;
		this.memberClass = MemberClass.method;
	}
}

class Parameter implements IParameter {
	types: Token[]
	req: boolean
	ret: boolean
	literal: boolean
	id: Token
	memberClass: MemberClass
	comment: Token

	constructor() {
		this.req = false
		this.ret = false
		this.literal = false
		this.memberClass = MemberClass.parameter
	}
}

const NON_METHOD_KEYWORDS = [
	'do', 'set', 'if', 'for', 'while'
]

export function parseText(sourceText: string): IDocument {
	let parser = new Parser();
	return parser.parseDocument(sourceText);
}

export function parseFile(sourcePath: string): Promise<IDocument> {
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
	private methods: Method[];
	private properties: IProperty[];
	private declarations: IDeclaration[];
	private activeMethod: Method;
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

	parseDocument(documentText: string): IDocument {
		this.tokenizer = getTokens(documentText);
		while (this.next()) {
			if (this.activeToken.type === Type.Alphanumeric || this.activeToken.type === Type.MinusSign) {
				let method = this.parseMethod();
				if (!method) continue;
				this.methods.push(method);
				this.activeMethod = method;
			}
			else if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space) {
				let tokenBuffer = this.loadTokenBuffer();
				let propertyDef = this.lookForPropertyDef(tokenBuffer);
				if (propertyDef) {
					if (propertyDef.id) this.properties.push(propertyDef);
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
			}
			else if (this.activeToken.type === Type.NewLine) continue;
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

	private lookForTypeDeclaration(tokenBuffer: Token[]): IDeclaration[] | undefined {
		let i = 0;
		let tokens: Token[] = [];
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.type === Type.Tab || token.type === Type.Space) {
				i++;
				continue;
			}
			if (token.type === Type.Alphanumeric && token.value === 'type') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					let loadToken = tokenBuffer[j];
					if (loadToken.type === Type.Space || loadToken.type === Type.Tab) continue;
					// if (loadToken.type === Type.EqualSign) break;
					tokens.push(loadToken);
				}
			}
			else if (token.type === Type.Alphanumeric && token.value === 'catch') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					let loadToken = tokenBuffer[j];
					if (loadToken.type === Type.Space || loadToken.type === Type.Tab) continue;
					// if (loadToken.type === Type.EqualSign) break;
					tokens.push({ type: Type.Alphanumeric, value: 'Error', position: { character: 0, line: 0 } });
					tokens.push(loadToken);
					break;
				}
			}
			break;
		}
		let memberClass = MemberClass.declaration
		let declarations: IDeclaration[] = [];
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
			else if (token.type === Type.Alphanumeric) {
				id = token;
				if (hasType && !type) type = token;
				// declarations.push({types: [type], identifier});
			}
			else if (token.type === Type.EqualSign) {
				tokenIndex = this.skipToNextDeclaration(tokens, tokenIndex)
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
			}
			else if (token.type === Type.OpenParen) {
				let types = [];
				let myIdentifier = tokens[tokenIndex - 2];
				while (tokenIndex < tokens.length) {
					let token = tokens[tokenIndex];
					tokenIndex++;
					if (token.type === Type.OpenParen) continue;
					else if (token.type === Type.Alphanumeric) {
						types.push(token)
					}
					else if (token.type === Type.Comma) {
						continue;
					}
					else if (token.type === Type.CloseParen) {
						if (type) declarations.push({ id: myIdentifier, types: [type].concat(types), memberClass, modifiers })
						id = undefined;
						break;
					}
				}
			}
			// Cheating!!
			// else if (token.type === Type.PercentSign) continue;
			else if (token.type === Type.Comma) {
				if (id && type) declarations.push({ types: [type], id, memberClass, modifiers });
				id = undefined;
				continue;
			}
			else if (token.value === '\r') continue;
			else if (token.type === Type.BlockComment) continue;
			else if (token.type === Type.BlockCommentInit) continue;
			else if (token.type === Type.BlockCommentTerm) continue;
			else if (token.type === Type.NewLine) {
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
			if (token.type === Type.Tab || token.type === Type.Space) {
				i++;
				continue;
			}
			else if (token.type === Type.NumberSign && !classDef) {
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
			else if (token.type === Type.EqualSign && !equals) {
				equals = true;
				i++
			}
			else if (token.type === Type.Alphanumeric && classDef && extending && equals) {
				return token;
			}
			else {
				break;
			}
		}
		return;
	}

	private skipToNextDeclaration(identifiers: Token[], tokenIndex: number): number {
		let parenStack = 0;
		while (tokenIndex < identifiers.length) {
			let token = identifiers[tokenIndex]
			tokenIndex++;
			if (token.type === Type.OpenParen) {
				parenStack++;
			}
			else if (token.type === Type.CloseParen) {
				parenStack--;
			}
			else if (token.type === Type.Comma && parenStack === 0) {
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
	private lookForPropertyDef(tokenBuffer: Token[]): IProperty | undefined {
		let i = 0;
		// TODO better loop
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.type === Type.Tab || token.type === Type.Space) {
				i++;
				continue;
			}
			if (token.type === Type.NumberSign) {
				try {
					token = tokenBuffer[i + 1];
				}
				catch (e) {
					return;
				}
				if (token.value === 'PROPERTYDEF') {
					let tokens = tokenBuffer.filter(t => {
						if (t.type === Type.NumberSign) return false;
						if (t.value === 'PROPERTYDEF') return false;
						return t.type !== Type.Space && t.type !== Type.Tab
					}
					)
					return { id: tokens[0], modifiers: tokens.slice(1), types: [], memberClass: MemberClass.property }

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

	// private loadIdentifiers(): Token[] {
	// 	let modifiers: Token[] = [];
	// 	while (this.next() && this.activeToken.type !== Type.NewLine) {
	// 		if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space) continue;
	// 		modifiers.push(this.activeToken);
	// 	}
	// 	return modifiers;
	// }

	private parseMethod(): Method | undefined {
		let batchLabel = false;
		let method: Method = new Method();
		do {
			if (!this.activeToken) continue;
			if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space) continue;
			else if (this.activeToken.type === Type.NewLine) break;
			else if (this.activeToken.type === Type.OpenParen) {
				let proccesed = this.proccessArgs(method);
				if (!proccesed) return undefined;
				method.parameters = proccesed;
				break;
			}
			else if (this.activeToken.type === Type.Alphanumeric || this.activeToken.type === Type.Numeric) {
				if (batchLabel) {
					method.modifiers.push(this.activeToken)
					method.batch = true;
					break;
				}
				if (method.line === -1) method.line = this.activeToken.position.line;
				method.modifiers.push(this.activeToken);
			}
			else if (this.activeToken.type === Type.MinusSign) {
				batchLabel = true;
				continue;
			}
			else if (this.activeToken.type === Type.LineCommentInit || this.activeToken.type === Type.LineComment || this.activeToken.type === Type.BlockCommentInit || this.activeToken.type === Type.BlockComment || this.activeToken.type === Type.BlockCommentTerm) {
				continue;
			}
			else if (this.activeToken.value === '\r') continue;
			else if (this.activeToken.type === Type.CloseParen) {
				if (!method.closeParen) {
					method.closeParen = this.activeToken;
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

	private finalizeMethod(method: Method) {
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
		this.activeMethod = method;
		return method;
	}

	private proccessArgs(method: Method): Parameter[] | undefined {

		let args: Parameter[] = [];
		let arg: Parameter | undefined;
		let open = false;
		while (this.next()) {
			if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space || this.activeToken.type === Type.NewLine) continue;
			else if (this.activeToken.type === Type.OpenParen) {
				open = true;
				if (!arg) return undefined;
				if (arg.types.length === 1 && !arg.id) {
					arg.id = arg.types[0];
					arg.types[0] = this.getDummy();
				}
				let objectArgs = this.proccessObjectArgs();
				if (!objectArgs) return undefined;
				arg.types = arg.types.concat(objectArgs);
				continue;
			}
			else if (this.activeToken.type === Type.CloseParen) {
				open = false;
				method.closeParen = this.activeToken;
				if (!arg) break;
				if (arg.types.length === 1 && !arg.id) {
					arg.id = arg.types[0]
					arg.types[0] = this.getDummy();
				}
				args.push(arg);
				break;
			}
			else if (this.activeToken.type === Type.Alphanumeric) {
				if (!arg) arg = new Parameter();
				// let value = this.activeToken.value;
				if (this.activeToken.value === 'req') arg.req = true;
				else if (this.activeToken.value === 'ret') arg.ret = true;
				else if (this.activeToken.value === 'literal') arg.literal = true;
				else if (!arg.types) arg.types = [this.activeToken];
				else {
					arg.id = this.activeToken;
				}
			}
			else if (this.activeToken.type === Type.LineComment) {
				if (arg) {
					arg.comment = this.activeToken
				}
				else if (args.length >= 1) {
					args[args.length - 1].comment = this.activeToken;
				}
			}
			else if (this.activeToken.type === Type.Comma) {
				if (!arg) return undefined;
				if (arg.types.length === 1 && !arg.id) {
					arg.id = arg.types[0]
					arg.types[0] = this.getDummy();
				}
				args.push(arg)
				arg = undefined;
			}
		}
		if (open) return undefined;
		return args;
	}

	private proccessObjectArgs(): Token[] | undefined {
		let types: Token[] = [];
		let found = false;
		while (this.next()) {
			let dummy = this.getDummy();
			if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space) continue;
			else if (this.activeToken.type === Type.CloseParen) {
				if (types.length === 0) types.push(dummy);
				return types;
			}
			else if (this.activeToken.type === Type.Alphanumeric) {
				if (!found) {
					types.push(this.activeToken);
					found = true;
				}
				else return undefined;
			}
			else if (this.activeToken.type === Type.Comma) {
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
		return { type: Type.Undefined, position: this.activeToken.position, value: '' };
	}
}