import { Token, getTokens, Type } from './tokenizer';

export enum SyntaxKind {
	SET,
	DO,
	IDENTIFIER,
	STRING_LITERAL,
	NUMERIC_LITERAL,
	UNARY_OPERATOR,
	BINARY_OPERATOR,
}

enum Operator {
	CONCATENATE = '_',
	PLUS = '+',
	EQUAL = '=',
	OR = 'or',
	AND = 'and',
	NOT = 'not',
	APOSTROPHE = '\'',
	DOT = '.',
	HAT = '^',
	DOLLAR = '$',
	DOLLAR_DOLLAR = '$$',
	AT = '@',
	LESS_THAN = '<',
	GREATER_THAN = '>',
	LESS_THAN_OR_EQUAL = '<=',
	GREATER_THAN_OR_EQUAL = '>=',
	LEFT_BRACKET = '[',
	RIGHT_BRACKET = ']'
}

const BINARY_OPERATORS: Operator[] = [
	Operator.CONCATENATE,
	Operator.DOT,
	Operator.EQUAL,
	Operator.AND,
	Operator.OR,
	Operator.PLUS,
	Operator.HAT,
	Operator.AT,
	Operator.LESS_THAN,
	Operator.GREATER_THAN,
	Operator.LESS_THAN_OR_EQUAL,
	Operator.GREATER_THAN_OR_EQUAL,		
]

const UNARY_OPERATORS: Operator[] = [
	Operator.DOT,
	Operator.NOT,
	Operator.APOSTROPHE,
	Operator.AT,
	Operator.PLUS,
	Operator.LEFT_BRACKET,
	Operator.RIGHT_BRACKET,
	Operator.DOLLAR,
	Operator.DOLLAR_DOLLAR,
]

export interface Node {
	kind: SyntaxKind
	parent?: Node
}

export interface UnaryOperator extends Node {
	operator: Token
	operand?: Node
}

export interface BinaryOperator extends Node {
	operator: Token
	left?: Node
	right?: Node
}


export type Expression = Value | UnaryOperator | BinaryOperator;

export interface Statement extends Node {
	action: Token
	expression: Expression
	block?: Node
}

export interface Value extends Node {
	id: Token
}

export interface NumericLiteral extends Value {}

export interface StringLiteral extends Value {
	openQuote: Token
	closeQuote: Token
}

export interface Identifier extends Value {
	args?: Expression[]
	openParen?: Token
	closeParen?: Token	
}

export class StatementParser {
	tokenizer: IterableIterator<Token>;
	tokens: Token[] = [];
	previousToken: Token | undefined;
	activeToken: Token | undefined;
	// activeNode: Node;

	constructor(documentText: string)
	constructor(tokenizer: IterableIterator<Token>)
	constructor(tokens: Token[])
	constructor(arg: string | IterableIterator<Token> | Token[]) {
		if (typeof arg === 'string')
			this.tokenizer = getTokens(arg);
		else if (Array.isArray(arg))
			this.tokenizer = arg[Symbol.iterator]();
		else
			this.tokenizer = arg;
		this.next(); // should I?
	}

	private next(skipSpaceOrTab?: boolean): boolean {
		if (this.activeToken) this.previousToken = this.activeToken;
		do {
			this.activeToken = this.tokenizer.next().value;
			if (this.activeToken) this.tokens.push(this.activeToken);
		} while (skipSpaceOrTab && this.activeToken && (this.activeToken.isSpace() || this.activeToken.isTab()));
		return this.activeToken !== undefined;
	}

	parseStatement(): Statement | undefined {
		if (!this.activeToken) return;
		switch (this.activeToken.value) {
			case "do":
				let doStatement = this.parseDoStatment();
				if (!doStatement) return;
				return doStatement;
			case "set":
				let setStatement = this.parseSetStatment();
				if (!setStatement) return;
				return setStatement;
			default:
				break;
		}
	}

	parseSetStatment(): Statement | undefined {
		if (!this.activeToken) return;
		let setToken = this.activeToken;
		let hasNext = this.next(true);
		if (!hasNext) return;
		
		let expression = this.parseExpression();
		if (expression) return { action: setToken, expression, kind: SyntaxKind.SET };
	}

	parseDoStatment(): Statement | undefined {
		if (!this.activeToken) return;
		let doToken = this.activeToken;
		let hasNext = this.next(true);
		if (!hasNext) return;
		let expression = this.parseExpression();
		if (expression) return { action: doToken, expression, kind: SyntaxKind.DO };
	}

	parseExpression(): Expression | undefined {
		let rootNode: Expression | undefined;
		rootNode = this.parseUniaryOperator();
		if (rootNode) (<UnaryOperator>rootNode).operand = this.parseValue();
		else rootNode = this.parseValue();
		while (this.activeToken && isBinaryOperator(this.activeToken.value)) {
			let operator: BinaryOperator = {
				operator: this.activeToken,
				left: rootNode,
				kind: SyntaxKind.BINARY_OPERATOR
			}
			this.next();
			operator.right = this.parseValue();
			rootNode = operator;
		}
		return rootNode;
	}

	parseUniaryOperator(): UnaryOperator | undefined {
		if (!this.activeToken) return;
		if (isUnaryOperator(this.activeToken.value)) return {kind: SyntaxKind.UNARY_OPERATOR, operator: this.activeToken};
	}

	parseValue(): Value | undefined {
		if (!this.activeToken) return;
		
		switch (this.activeToken.type) {
			case Type.Alphanumeric:
				return this.parseIdentifier();
			case Type.DoubleQuotes:
				return this.parseStringLiteral();
			case Type.Numeric:
				return {id: this.activeToken, kind: SyntaxKind.NUMERIC_LITERAL} as NumericLiteral
			default:
				return;
		}
	}
	parseIdentifier(): Identifier | undefined {
		if (!this.activeToken) return;
		let id = this.activeToken;
		if (this.next() && this.activeToken.isOpenParen()) {
			let openParen = this.activeToken;
			if (this.next(true)) {
				let args = this.parseArgs();
				if (this.activeToken.isCloseParen()) {
					let closeParen = this.activeToken;
					this.next();
					return { id, kind: SyntaxKind.IDENTIFIER, args, openParen, closeParen } as Identifier;
				}
			}
		}
		return {id, kind: SyntaxKind.IDENTIFIER};
	}
	parseStringLiteral(): StringLiteral | undefined {
		if (!this.activeToken) return;
		let openQuote = this.activeToken;
		this.next();
		let id = this.activeToken;
		if (!id || !this.next()) return;
		if (this.activeToken.isDoubleQuotes()) {
			let closeQuote = this.activeToken;
			this.next(true);
			return { id, kind: SyntaxKind.STRING_LITERAL, openQuote, closeQuote };
		}
	}

	parseArgs(): Expression[] {
		let args: Expression[] = [];
		do {
			if (this.activeToken && this.activeToken.isComma()) continue;
			if (this.activeToken && !this.activeToken.isWhiteSpace()) {
				let arg = this.parseExpression();
				if (arg) args.push(arg);
				else break;
			}
			if (!this.activeToken || this.activeToken.isCloseParen()) break;
		} while (this.next(true))
		return args;
	}
}

function isBinaryOperator(tokenValue: string) {
	return BINARY_OPERATORS.indexOf(<Operator>tokenValue) !== -1;
}

function isUnaryOperator(tokenValue: string) {
	return UNARY_OPERATORS.indexOf(<Operator>tokenValue) !== -1;
}
