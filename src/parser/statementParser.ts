import { getTokens, Token, Type } from './tokenizer';

export enum SyntaxKind {
	ASSIGNMENT,
	BINARY_OPERATOR,
	CATCH_STATEMENT,
	DO_STATEMENT,
	FOR_STATEMENT,
	IDENTIFIER,
	IF_STATEMENT,
	NUMERIC_LITERAL,
	POST_CONDITION,
	QUIT_STATEMENT,
	RETURN_STATEMENT,
	SET_STATEMENT,
	STRING_LITERAL,
	WHILE_STATEMENT,
	TYPE_STATEMENT,
	VARIABLE_DECLARATION,
}

enum OPERATOR_VALUE {
	AND_LITERAL = 'and',
	APOSTROPHE = '\'',
	AT = '@',
	BACK_SLASH = '\\',
	CARROT = '^',
	COLON = ':',
	DOLLAR = '$',
	DOT = '.',
	EQUAL = '=',
	EXCLAMATION = '!',
	GREATER_THAN = '>',
	HASH = '#',
	LEFT_BRACKET = '[',
	LESS_THAN = '<',
	MINUS = '-',
	NOT_LITERAL = 'not',
	OR_LITERAL = 'or',
	PLUS = '+',
	QUESTION_MARK = '?',
	RIGHT_BRACKET = ']',
	SLASH = '/',
	STAR = '*',
	UNDERSCORE = '_',
	RET = 'ret',
}

enum STORAGE_MODIFIERS {
	STATIC = 'static',
	NEW = 'new',
	LITERAL = 'literal',
}

enum ACCESS_MODIFIERS {
	PUBLIC = 'public',
	PRIVATE = 'private',

}

interface Operator {
	value: OPERATOR_VALUE;
	appendable?: boolean;
}

const UNARY_OPERATORS: Operator[] = [
	{ value: OPERATOR_VALUE.APOSTROPHE },
	{ value: OPERATOR_VALUE.AT },
	{ value: OPERATOR_VALUE.CARROT },
	{ value: OPERATOR_VALUE.DOLLAR, appendable: true },
	{ value: OPERATOR_VALUE.DOT },
	{ value: OPERATOR_VALUE.LEFT_BRACKET },
	{ value: OPERATOR_VALUE.MINUS },
	{ value: OPERATOR_VALUE.NOT_LITERAL },
	{ value: OPERATOR_VALUE.PLUS },
	{ value: OPERATOR_VALUE.RIGHT_BRACKET },
	{ value: OPERATOR_VALUE.RET },
];

const BINARY_OPERATORS: Operator[] = [
	{ value: OPERATOR_VALUE.AND_LITERAL },
	{ value: OPERATOR_VALUE.AT },
	{ value: OPERATOR_VALUE.BACK_SLASH },
	{ value: OPERATOR_VALUE.CARROT },
	{ value: OPERATOR_VALUE.DOT },
	{ value: OPERATOR_VALUE.EQUAL },
	{ value: OPERATOR_VALUE.EXCLAMATION },
	{ value: OPERATOR_VALUE.GREATER_THAN, appendable: true },
	{ value: OPERATOR_VALUE.HASH },
	{ value: OPERATOR_VALUE.LESS_THAN, appendable: true },
	{ value: OPERATOR_VALUE.MINUS },
	{ value: OPERATOR_VALUE.OR_LITERAL },
	{ value: OPERATOR_VALUE.PLUS },
	{ value: OPERATOR_VALUE.QUESTION_MARK },
	{ value: OPERATOR_VALUE.SLASH },
	{ value: OPERATOR_VALUE.STAR },
	{ value: OPERATOR_VALUE.UNDERSCORE },
];

export interface Node {
	kind: SyntaxKind;
	parent?: Node;
}

export interface BinaryOperator extends Node {
	operator: Token[];
	left?: Node | Node[]; // Node[] for case when set (x,y) = z
	right?: Node;
}

export interface PostCondition extends Node {
	colon: Token;
	condition?: Expression;
	expression?: Expression | Expression[]; // Expression[] for case when set:a (x,y)
}

export type Expression = Value | BinaryOperator | PostCondition;

export interface Statement extends Node {
	action: Token;
	expressions: Expression[];
	block?: Node;
}

export interface Value extends Node {
	id: Token;
	unaryOperator?: Token[];
}

export interface NumericLiteral extends Value { }

export interface StringLiteral extends Value {
	openQuote: Token;
	closeQuote: Token;
}

export interface Identifier extends Value {
	args?: Expression[];
	openParen?: Token;
	closeParen?: Token;
}

export interface Declaration extends Identifier {
	type: Token;
	staticToken?: Token;
	newToken?: Token;
	publicToken?: Token;
	literalToken?: Token;
}

export class StatementParser {
	tokenizer: IterableIterator<Token>;
	tokens: Token[] = [];
	previousToken: Token | undefined;
	activeToken: Token | undefined;

	constructor(arg: string | IterableIterator<Token> | Token[]) {
		if (typeof arg === 'string') {
			this.tokenizer = getTokens(arg);
		}
		else if (Array.isArray(arg)) {
			this.tokenizer = arg[Symbol.iterator]();
		}
		else {
			this.tokenizer = arg;
		}
		this.next(); // should I?
	}

	parseLine(): Statement[] {
		if (!this.activeToken) return [];
		const statements: Statement[] = [];
		do {
			if (this.activeToken.isNewLine()) break;
			if (this.activeToken.isAlphanumeric()) {
				const statement = this.parseStatement();
				if (!statement) {
					this.next();
					continue;
				}
				statements.push(statement);
			}
			else if (this.activeToken.isWhiteSpace()) this.next(true);
			else break;
		} while (this.activeToken);
		return statements;
	}

	parseStatement(): Statement | undefined {
		if (!this.activeToken) return;

		let loadFunction;
		let kind;
		if (this.activeToken.value === 'do') {
			loadFunction = () => this.parseExpression();
			kind = SyntaxKind.DO_STATEMENT;
		}
		else if (this.activeToken.value === 'set') {
			loadFunction = () => this.parseSetExpression();
			kind = SyntaxKind.SET_STATEMENT;
		}
		else if (this.activeToken.value === 'if') {
			loadFunction = () => this.parseExpression();
			kind = SyntaxKind.IF_STATEMENT;
		}
		else if (this.activeToken.value === 'catch') {
			loadFunction = () => this.parseExpression();
			kind = SyntaxKind.CATCH_STATEMENT;
		}
		else if (this.activeToken.value === 'for') {
			return this.parseForStatement();
		}
		else if (this.activeToken.value === 'quit') {
			const action = this.activeToken;
			if (!this.next(true)) return { action, kind: SyntaxKind.QUIT_STATEMENT, expressions: [] };
			const condition = this.parsePostCondition();
			const statement = { kind: SyntaxKind.QUIT_STATEMENT, action, expressions: [] };
			if (condition) statement.expressions.push(condition);
			return statement;
		}
		else if (this.activeToken.value === 'return') {
			const action = this.activeToken;
			if (!this.next(true)) return { action, kind: SyntaxKind.RETURN_STATEMENT, expressions: [] };
			const expression = this.parseExpression();
			return { kind: SyntaxKind.RETURN_STATEMENT, action, expressions: [expression] };
		}
		else if (this.activeToken.value === 'while') {
			const action = this.activeToken;
			if (!this.next(true)) return { action, kind: SyntaxKind.WHILE_STATEMENT, expressions: [] };
			const expression = this.parseExpression();
			return { kind: SyntaxKind.WHILE_STATEMENT, action, expressions: [expression] };
		}
		else if (this.activeToken.value === 'type') {
			const action = this.activeToken;
			if (!this.next(true)) return { action, kind: SyntaxKind.TYPE_STATEMENT, expressions: [] };
			const expression = this.parseTypeExpression();
			return { kind: SyntaxKind.TYPE_STATEMENT, action, expressions: [expression] };
		}
		else return;

		const action = this.activeToken;
		if (!this.next(true)) return { action, kind, expressions: [] };
		const expressions: Expression[] = this.loadCommaSeparated(loadFunction);
		return { kind, action, expressions };
	}
	parseTypeExpression(): Expression {
		let staticToken: Token | undefined;
		let newToken: Token | undefined;
		let publicToken: Token | undefined;
		let literalToken: Token | undefined;

		const getKeyWordToken = (token: Token) => {
			switch (token.value) {
				case ACCESS_MODIFIERS.PUBLIC:
					publicToken = token;
					return true;
				case STORAGE_MODIFIERS.LITERAL:
					literalToken = token;
					return true;
				case STORAGE_MODIFIERS.NEW:
					newToken = token;
					return true;
				case STORAGE_MODIFIERS.STATIC:
					staticToken = token;
					return true;
				default:
					return false;
			}
		};

		while (getKeyWordToken(this.activeToken)) {
			if (!this.next(true)) break;
		}

		const type = this.activeToken;
		this.next(true);
		const id = this.activeToken;
		this.next(true);
		let args;
		if (this.activeToken && this.activeToken.isOpenParen()) {
			this.next(true);
			args = this.loadCommaSeparated(() => this.parseValue() as Identifier);
		}

		const declaration: Declaration = {
			args,
			id,
			kind: SyntaxKind.VARIABLE_DECLARATION,
			literalToken,
			newToken,
			publicToken,
			staticToken,
			type,
		};

		let rootNode: Expression = declaration;
		if (this.activeToken && this.activeToken.isEqualSign()) {
			const equalSign = this.activeToken;
			this.next(true);
			const expression = this.parseExpression();
			rootNode = { operator: [equalSign], kind: SyntaxKind.ASSIGNMENT };
			rootNode.left = declaration;
			rootNode.right = expression;
		}
		return rootNode;
	}
	parseForStatement(): Statement | undefined {
		if (!this.activeToken) return;
		const action = this.activeToken;
		const forStatement: Statement = { action, kind: SyntaxKind.FOR_STATEMENT, expressions: [] };
		if (!this.next()) return forStatement; // consume for
		if (!this.next()) return forStatement; // consume first space
		const spaceOrExpression = this.activeToken;
		if (spaceOrExpression.isSpace()) {
			this.next();
			return forStatement; // argumentless for
		}
		const expression = this.parseExpression();
		if (expression) forStatement.expressions.push(expression);
		return forStatement;
	}

	parseSetExpression(): Expression | Expression[] | undefined {
		if (!this.activeToken) return;
		const postCondition: PostCondition | undefined = this.parsePostCondition();
		const leftSide = this.parseSetVariables();
		if (this.activeToken && this.activeToken.isWhiteSpace()) this.next(true);
		if (this.activeToken && this.activeToken.isEqualSign()) {
			const equalSign = this.activeToken;
			this.next(true);
			const expression = this.parseExpression();
			const assignment: BinaryOperator = { operator: [equalSign], kind: SyntaxKind.ASSIGNMENT };
			assignment.left = leftSide;
			assignment.right = expression;
			if (postCondition) {
				postCondition.expression = assignment;
				return postCondition;
			}
			return assignment;
		}
		else {
			if (postCondition) {
				postCondition.expression = leftSide;
				return postCondition;
			}
			return leftSide;
		}
	}

	parsePostCondition(): PostCondition | undefined {
		if (!this.activeToken) return;
		if (this.activeToken.isColon()) {
			const colon = this.activeToken;
			const postCondition: PostCondition = { kind: SyntaxKind.POST_CONDITION, colon };
			this.next(true);
			const condition = this.parseExpression();
			if (!condition) return postCondition;
			postCondition.condition = condition;
			return postCondition;
		}
	}

	parseSetVariables(): Expression | Expression[] | undefined {
		if (!this.activeToken) return [];
		if (this.activeToken.isOpenParen()) {
			this.next(true);
			const variables = this.loadCommaSeparated<Expression>(() => this.parseExpression());
			if (this.activeToken && this.activeToken.isCloseParen()) this.next(true);
			return variables;
		}
		else {
			return this.parseExpression(true);
		}
	}

	parseExpression(ignoreEquals?: boolean, includeRet?: boolean): Expression | undefined {
		const postCondition = this.parsePostCondition();

		let rootNode = this.parseValue(undefined, includeRet);
		if (!rootNode) {
			if (postCondition) return postCondition;
			else return;
		}

		if (this.activeToken && this.activeToken.isEqualSign() && ignoreEquals) {
			return rootNode;
		}

		rootNode = this.parseOperatorSeparatedValues(rootNode, ignoreEquals);
		if (!rootNode) return;

		rootNode = this.parseColonSeparatedValues(rootNode);

		if (postCondition) {
			postCondition.expression = rootNode;
			rootNode = postCondition;
		}

		return rootNode;
	}

	parseColonSeparatedValues(rootNode: Expression) {
		while (this.activeToken && this.activeToken.isColon()) {
			const colonToken = this.activeToken;
			this.next(true);
			const colon: BinaryOperator = {
				kind: SyntaxKind.BINARY_OPERATOR,
				operator: [colonToken],
				left: rootNode,
				right: this.parseValue()
			};
			rootNode = colon;
		}
		return rootNode;
	}

	parseOperatorSeparatedValues(rootNode: Expression, ignoreEquals?: boolean) {
		while (this.activeToken && getBinaryOperator(this.activeToken.value)) {
			if (this.activeToken.isEqualSign() && ignoreEquals) break;
			const operator = this.parseBinaryOperator();
			if (!operator) return;
			operator.left = rootNode;
			operator.right = this.parseValue();
			rootNode = operator;
		}
		return rootNode;
	}

	parseBinaryOperator(): BinaryOperator | undefined {
		if (!this.activeToken) return;
		const operator: BinaryOperator = {
			operator: [this.activeToken],
			kind: SyntaxKind.BINARY_OPERATOR
		};
		if (!this.next(true)) return operator;
		let binaryOperator;
		do {
			binaryOperator = getBinaryOperator(this.activeToken.value);
			if (!binaryOperator) break;
			operator.operator.push(this.activeToken);
			this.next(true);
		} while (binaryOperator && binaryOperator.appendable);
		return operator;
	}

	parseUnaryOperator(includeRet?: boolean): Token[] {
		if (!this.activeToken) return [];
		const leftOperator: Token[] = [];
		let unaryOperator = getUnaryOperator(this.activeToken.value, includeRet);
		if (unaryOperator) {
			leftOperator.push(this.activeToken);
			this.next(true);
			while (unaryOperator && unaryOperator.appendable) {
				unaryOperator = getUnaryOperator(this.activeToken.value);
				if (unaryOperator) {
					leftOperator.push(this.activeToken);
					this.next(true);
				}
			}
		}
		return leftOperator;
	}

	parseValue(tree?: BinaryOperator, includeRet?: boolean): Value | Expression | undefined {
		let value: Value | Expression | undefined;
		if (!this.activeToken || this.activeToken.isWhiteSpace()) {
			if (tree) return tree;
			else return;
		}

		const unaryOperator: Token[] = this.parseUnaryOperator(includeRet);
		if (!this.activeToken) return { id: new Token(Type.Undefined, '', { character: 0, line: 0 }), unaryOperator, kind: SyntaxKind.IDENTIFIER };
		if (this.activeToken.type === Type.Alphanumeric) {
			value = this.parseIdentifier();
			if (!value) return;
			if (unaryOperator.length) value.unaryOperator = unaryOperator;
		}
		else if (this.activeToken.type === Type.DoubleQuotes) {
			value = this.parseStringLiteral();
			if (!value) return;
			if (unaryOperator.length) value.unaryOperator = unaryOperator;
		}
		else if (this.activeToken.type === Type.Numeric) {
			value = { id: this.activeToken, kind: SyntaxKind.NUMERIC_LITERAL } as NumericLiteral;
			if (unaryOperator.length) value.unaryOperator = unaryOperator;
			this.next(true);
		}
		else if (this.activeToken.type === Type.OpenParen) {
			this.next(true);
			value = this.parseExpression();
			this.next(true);
		}
		if (tree && value) {
			tree.right = value;
			value = tree;
		}
		if (this.activeToken && (this.activeToken.type === Type.Period || this.activeToken.type === Type.Caret)) {
			const operator: BinaryOperator = {
				operator: [this.activeToken],
				left: value,
				kind: SyntaxKind.BINARY_OPERATOR
			};
			this.next();
			return this.parseValue(operator);
		}

		if (value && this.activeToken && this.activeToken.isWhiteSpace()) this.next(true);

		return value;
	}

	parseIdentifier(): Identifier | undefined {
		if (!this.activeToken) return;
		const id = this.activeToken;
		if (this.next() && this.activeToken.isOpenParen()) {
			const openParen = this.activeToken;
			if (this.next(true)) {
				const args = this.parseArgs();
				if (this.activeToken.isCloseParen()) {
					const closeParen = this.activeToken;
					this.next();
					return { id, kind: SyntaxKind.IDENTIFIER, args, openParen, closeParen } as Identifier;
				}
			}
		}
		return { id, kind: SyntaxKind.IDENTIFIER };
	}

	parseStringLiteral(): StringLiteral | undefined {
		if (!this.activeToken) return;
		const openQuote = this.activeToken;
		this.next();
		const id = this.activeToken;
		if (!id || !this.next()) return;
		if (this.activeToken.isDoubleQuotes()) {
			const closeQuote = this.activeToken;
			this.next(true);
			return { id, kind: SyntaxKind.STRING_LITERAL, openQuote, closeQuote };
		}
	}

	parseArgs(): Expression[] {
		return this.loadCommaSeparated<Expression>(() => this.parseExpression(false, true));
	}

	loadCommaSeparated<T>(getArg: () => T | T[] | undefined): T[] {
		const args: T[] = [];
		do {
			if (!this.activeToken) break;
			if (this.activeToken.isWhiteSpace()) {
				if (!this.next(true)) break;
			}
			if (this.activeToken.isComma()) {
				args.push(undefined); // desired behavior?
				continue;
			}
			const arg: T | T[] | undefined = getArg();
			if (arg && !Array.isArray(arg)) args.push(arg);
			else if (arg) args.push(...(arg as T[]));
			else if (!arg && args.length > 0) args.push(undefined);
			else break;
			if (!this.activeToken) break;
		} while (this.activeToken.isComma() && this.next(true));
		return args;
	}

	private next(skipSpaceOrTab?: boolean): boolean {
		if (this.activeToken) this.previousToken = this.activeToken;
		do {
			this.activeToken = this.tokenizer.next().value;
			if (this.activeToken) this.tokens.push(this.activeToken);
		} while (skipSpaceOrTab && this.activeToken && (this.activeToken.isSpace() || this.activeToken.isTab()));
		return this.activeToken !== undefined;
	}
}

function getBinaryOperator(tokenValue: string): Operator | undefined {
	return BINARY_OPERATORS.find(o => o.value === tokenValue);
}

function getUnaryOperator(tokenValue: string, includeRet?: boolean): Operator | undefined {
	const operator = UNARY_OPERATORS.find(o => o.value === tokenValue);
	if (!operator) return;
	if (operator.value === OPERATOR_VALUE.RET && !includeRet) return;
	return operator;
}

export function forEachChild(node: Node, f: (n: Node) => boolean) {
	let goDeeper: boolean = false;
	switch (node.kind) {
		case SyntaxKind.DO_STATEMENT:
		case SyntaxKind.IF_STATEMENT:
		case SyntaxKind.QUIT_STATEMENT:
		case SyntaxKind.RETURN_STATEMENT:
		case SyntaxKind.SET_STATEMENT:
		case SyntaxKind.WHILE_STATEMENT:
		case SyntaxKind.FOR_STATEMENT:
		case SyntaxKind.CATCH_STATEMENT:
			goDeeper = f(node);
			if (!goDeeper) return;
			const statement = node as Statement;
			statement.expressions.forEach(expression => {
				if (!expression) return;
				forEachChild(expression, f);
			});
			break;
		case SyntaxKind.ASSIGNMENT:
		case SyntaxKind.BINARY_OPERATOR:
			goDeeper = f(node);
			if (!goDeeper) return;
			const assignment = node as BinaryOperator;
			const left = assignment.left;
			if (Array.isArray(left)) {
				left.forEach(n => {
					forEachChild(n, f);
				});
			}
			else if (left) {
				forEachChild(left, f);
			}
			const right = assignment.right;
			if (right) {
				forEachChild(right, f);
			}
			break;
		case SyntaxKind.POST_CONDITION:
			goDeeper = f(node);
			if (!goDeeper) return;
			const postCondition = node as PostCondition;
			if (postCondition.condition) forEachChild(postCondition.condition, f);
			if (postCondition.expression) {
				const expression = postCondition.expression;
				if (Array.isArray(expression)) {
					expression.forEach(n => {
						forEachChild(n, f);
					});
				}
				else if (expression) {
					forEachChild(expression, f);
				}
			}
			break;
		case SyntaxKind.IDENTIFIER:
			goDeeper = f(node);
			if (!goDeeper) return;
			const identifier = node as Identifier;
			if (identifier.args) identifier.args.forEach(arg => forEachChild(arg, f));
			break;
		case SyntaxKind.NUMERIC_LITERAL:
		case SyntaxKind.STRING_LITERAL:
			f(node);
			break;
		default:
			break;
	}
}
