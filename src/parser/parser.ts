import { getTokens, Token, Type } from './tokenizer';
import * as fs from 'fs';

export enum MemberClass {
	method = 1,
	parameter = 2,
	property = 3,
	declaration = 4
}

export interface Member {
	id: Token
	types: Token[]
	memberClass: MemberClass
}

export class Method implements Member {
	id: Token
	types: Token[]
	modifiers: Token[]
	parameters: Parameter[]
	declarations: Declaration[];
	line: number
	endLine: number
	batch: boolean;
	memberClass: MemberClass

	constructor() {
		this.types = []
		this.modifiers = [];
		this.parameters = [];
		this.line = -1;
		this.declarations = [];
		this.endLine = -1;
		this.memberClass = MemberClass.method
	}
}


export interface Property extends Member {
	id: Token
	modifiers: Token[]
}

export class Parameter implements Member {
	types: Token[]
	req: boolean
	ret: boolean
	literal: boolean
	id: Token
	// doc: string
	memberClass: MemberClass

	constructor() {
		this.req = false
		this.ret = false
		this.literal = false
		this.memberClass = MemberClass.parameter
	}
}

export interface Declaration extends Member {
	id: Token,
	types: Token[],
}

const NON_METHOD_KEYWORDS = [
	'do', 'set', 'if', 'for', 'while'
]

export interface Document {
	declarations: Declaration[];
	properties: Property[];
	methods: Method[];
	tokens: Token[];
	extending: Token;
}

export function parseText(sourceText: string): Document {
	let parser = new Parser();
	return parser.parseDocument(sourceText);
}

export function parseFile(sourcePath: string): Promise<Document> {
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
	private properties: Property[];
	private declarations: Declaration[];
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

	parseDocument(documentText: string): Document {
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

	private lookForTypeDeclaration(tokenBuffer: Token[]): Declaration[] | undefined {
		let i = 0;
		let modifiers: Token[] = [];
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
					modifiers.push(loadToken);
				}
			}
			else if (token.type === Type.Alphanumeric && token.value === 'catch') {
				for (let j = i + 1; j < tokenBuffer.length; j++) {
					let loadToken = tokenBuffer[j];
					if (loadToken.type === Type.Space || loadToken.type === Type.Tab) continue;
					// if (loadToken.type === Type.EqualSign) break;
					modifiers.push({ type: Type.Alphanumeric, value: 'Error', position: { character: 0, line: 0 } });
					modifiers.push(loadToken);
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
		while (tokenIndex < modifiers.length) {
			let token = modifiers[tokenIndex];
			tokenIndex++;
			if (this.isDeclarationKeyword(token)) continue;
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
				tokenIndex = this.skipToNextDeclaration(modifiers, tokenIndex)
				if (id && type) declarations.push({ types: [type], id, memberClass });
				id = undefined;
			}
			else if (token.type === Type.OpenParen) {
				let types = [];
				let myIdentifier = modifiers[tokenIndex - 2];
				while (tokenIndex < modifiers.length) {
					let token = modifiers[tokenIndex];
					tokenIndex++;
					if (token.type === Type.OpenParen) continue;
					else if (token.type === Type.Alphanumeric) {
						types.push(token)
					}
					else if (token.type === Type.Comma) {
						continue;
					}
					else if (token.type === Type.CloseParen) {
						if (type) declarations.push({ id: myIdentifier, types: [type].concat(types), memberClass })
						id = undefined;
						break;
					}
				}
			}
			// Cheating!!
			// else if (token.type === Type.PercentSign) continue;
			else if (token.type === Type.Comma) {
				if (id && type) declarations.push({ types: [type], id, memberClass });
				id = undefined;
				continue;
			}
			else if (token.value === '\r') continue;
			else if (token.type === Type.BlockComment) continue;
			else if (token.type === Type.BlockCommentInit) continue;
			else if (token.type === Type.BlockCommentTerm) continue;
			else if (token.type === Type.NewLine) {
				if (id && type) declarations.push({ types: [type], id, memberClass });
				id = undefined;
				break
			}
			else break;
		}
		if (id && type) declarations.push({ types: [type], id, memberClass });
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
	private lookForPropertyDef(tokenBuffer: Token[]): Property | undefined {
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
				let proccesed = this.proccessArgs();
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

	private proccessArgs(): Parameter[] | undefined {
		let args: Parameter[] = [];
		let arg: Parameter | undefined;
		let open = false;
		while (this.next()) {
			if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space || this.activeToken.type === Type.NewLine) continue;
			else if (this.activeToken.type === Type.OpenParen) {
				open = true;
				if (!arg) return undefined;
				let objectArgs = this.proccessObjectArgs();
				if (!objectArgs) return undefined;
				arg.types = arg.types.concat(objectArgs);
				continue;
			}
			else if (this.activeToken.type === Type.CloseParen) {
				open = false;
				if (!arg) break;
				if (arg.types.length === 1 && !arg.id) {
					arg.id = arg.types[0]
					arg.types[0] = { value: 'void', type: Type.Alphanumeric, position: { character: 0, line: 0 } }
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

			}
			else if (this.activeToken.type === Type.Comma) {
				if (!arg) return undefined;
				if (arg.types.length === 1 && !arg.id) {
					arg.id = arg.types[0]
					arg.types[0] = { value: 'void', type: Type.Alphanumeric, position: { character: 0, line: 0 } }
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
			if (this.activeToken.type === Type.Tab || this.activeToken.type === Type.Space) continue;
			else if (this.activeToken.type === Type.CloseParen) {
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
				found = false;
				continue;
			}
		}
		return undefined;
	}
}