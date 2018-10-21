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
	MULTIPLE_VARIABLE_SET,
	STRING_LITERAL,
	WHILE_STATEMENT,
	TYPE_STATEMENT,
	VARIABLE_DECLARATION,
	TYPE_IDENTIFIER,
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

enum STATEMENT_KEYWORD {
	DO = 'do',
	SET = 'set',
	IF = 'if',
	CATCH = 'catch',
	FOR = 'for',
	QUIT = 'quit',
	RETURN = 'return',
	WHILE = 'while',
	TYPE = 'type',
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
	{ value: OPERATOR_VALUE.MINUS },
	{ value: OPERATOR_VALUE.NOT_LITERAL },
	{ value: OPERATOR_VALUE.PLUS },
	{ value: OPERATOR_VALUE.RIGHT_BRACKET },
	{ value: OPERATOR_VALUE.RET },
];

const BINARY_OPERATORS: Operator[] = [
	{ value: OPERATOR_VALUE.AND_LITERAL },
	{ value: OPERATOR_VALUE.APOSTROPHE, appendable: true },
	{ value: OPERATOR_VALUE.AT },
	{ value: OPERATOR_VALUE.BACK_SLASH },
	{ value: OPERATOR_VALUE.CARROT },
	{ value: OPERATOR_VALUE.DOT },
	{ value: OPERATOR_VALUE.EQUAL },
	{ value: OPERATOR_VALUE.EXCLAMATION },
	{ value: OPERATOR_VALUE.GREATER_THAN, appendable: true },
	{ value: OPERATOR_VALUE.HASH },
	{ value: OPERATOR_VALUE.LEFT_BRACKET },
	{ value: OPERATOR_VALUE.LESS_THAN, appendable: true },
	{ value: OPERATOR_VALUE.MINUS },
	{ value: OPERATOR_VALUE.NOT_LITERAL, appendable: true },
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
	left?: Node;
	right?: Node;
}

export interface MultiSet extends Node {
	variables: Expression[];
}

export interface PostCondition extends Node {
	colon: Token;
	condition?: Expression;
	expression?: Expression | MultiSet;
}

export type Expression = Value | BinaryOperator | PostCondition | MultiSet;

export interface Statement extends Node {
	action: Token;
	expressions: Expression[];
	block?: Node;
}

export interface Value extends Node {
	id: Token;
	unaryOperator?: Token[];
}

export type NumericLiteral = Value;

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
	type: TypeIdentifier;
	staticToken?: Token;
	newToken?: Token;
	publicToken?: Token;
	literalToken?: Token;
}

export type TypeIdentifier = Identifier;

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
		if (!this.activeToken.isAlphanumeric()) return;

		const action = this.activeToken;
		let loadFunction: () => Expression | undefined;
		let kind: SyntaxKind;

		const loadSingleExpression = (): Statement => {
			if (!this.next(true)) return { action, kind, expressions: [] };
			const expression: Expression | undefined = loadFunction();
			const expressions = expression ? [expression] : [];
			return { kind, action, expressions };
		};

		const loadCommaSeparatedExpressions = (): Statement => {
			if (!this.next(true)) return { action, kind, expressions: [] };
			const expressions: Expression[] = this.loadCommaSeparated(loadFunction);
			return { kind, action, expressions };
		};

		switch (action.value) {
			case STATEMENT_KEYWORD.DO:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.DO_STATEMENT;
				return loadCommaSeparatedExpressions();

			case STATEMENT_KEYWORD.SET:
				loadFunction = () => this.parseSetExpression();
				kind = SyntaxKind.SET_STATEMENT;
				return loadCommaSeparatedExpressions();

			case STATEMENT_KEYWORD.IF:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.IF_STATEMENT;
				return loadCommaSeparatedExpressions();

			case STATEMENT_KEYWORD.CATCH:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.CATCH_STATEMENT;
				return loadCommaSeparatedExpressions();

			case STATEMENT_KEYWORD.FOR:
				return this.parseForStatement();

			case STATEMENT_KEYWORD.QUIT:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.QUIT_STATEMENT;
				return loadCommaSeparatedExpressions();

			case STATEMENT_KEYWORD.RETURN:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.RETURN_STATEMENT;
				return loadSingleExpression();

			case STATEMENT_KEYWORD.WHILE:
				loadFunction = () => this.parseExpression();
				kind = SyntaxKind.WHILE_STATEMENT;
				return loadSingleExpression();

			case STATEMENT_KEYWORD.TYPE:
				return this.parseTypeStatement();

			default:
				return;
		}
	}

	parseTypeStatement(): Statement {
		const action = this.activeToken as Token;
		this.next(true);
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

		const parseTypeAssignments = (): Expression[] => {
			if (!this.activeToken || !this.activeToken.isAlphanumeric()) {
				if (literalToken || newToken || publicToken || staticToken) {
					const emptyDeclaration: Declaration = {
						id: undefined,
						kind: SyntaxKind.VARIABLE_DECLARATION,
						literalToken: undefined,
						newToken,
						publicToken,
						staticToken,
						type: undefined,
					};
					return [emptyDeclaration];
				}
				return [];
			}

			const type: TypeIdentifier = { id: this.activeToken, kind: SyntaxKind.TYPE_IDENTIFIER };
			if (!this.next(true) || staticToken) {
				const declaration: Declaration = {
					id: undefined,
					kind: SyntaxKind.VARIABLE_DECLARATION,
					literalToken,
					newToken,
					publicToken,
					staticToken,
					type,
				};
				return [declaration];
			}
			const assignments =
				this.loadCommaSeparated(() => {
					return this.parseAssignment(() => {
						const variable = this.parseValue() as Identifier; // why not parseIdentifier
						return {
							args: variable.args,
							id: variable.id,
							kind: SyntaxKind.VARIABLE_DECLARATION,
							literalToken,
							newToken,
							publicToken,
							staticToken,
							type,
						};
					});
				});
			assignments.forEach(expression => {
				forEachChild(expression, node => {
					if (!node) return;
					if (node.kind === SyntaxKind.VARIABLE_DECLARATION) {
						const declaration = node as Declaration;
						if (declaration.args) {
							declaration.args = declaration.args.map((arg: Identifier) => {
								if (!arg) return;
								arg.kind = SyntaxKind.TYPE_IDENTIFIER;
								return arg;
							});
						}
					}
					return true;
				});
			});
			return assignments;
		};

		while (this.activeToken && getKeyWordToken(this.activeToken)) {
			if (!this.next(true)) break;
		}

		const expressions = parseTypeAssignments();
		return {
			action,
			expressions,
			kind: SyntaxKind.TYPE_STATEMENT,
		};
	}

	parseAssignment(getLeft: () => Expression | MultiSet | Declaration | undefined): Expression | undefined {
		const left = getLeft();
		let rootNode = left;
		if (this.activeToken && this.activeToken.isEqualSign()) {
			const equalSign = this.activeToken;
			this.next(true);
			const expression = this.parseExpression();
			rootNode = { operator: [equalSign], kind: SyntaxKind.ASSIGNMENT };
			rootNode.left = left;
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

	parseSetExpression(): Expression | undefined {
		if (!this.activeToken) return;
		const postCondition: PostCondition | undefined = this.parsePostCondition();
		const assignment = this.parseAssignment(() => {
			const setVariables = this.parseSetVariables();
			if (this.activeToken && this.activeToken.isWhiteSpace()) this.next(true);
			if (postCondition && !setVariables) {
				postCondition.expression = setVariables;
				return postCondition;
			}
			return setVariables;
		});
		if (assignment && postCondition) {
			postCondition.expression = assignment;
			return postCondition;
		}
		return assignment;
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

	parseSetVariables(): Expression | undefined {
		if (!this.activeToken) return;
		if (this.activeToken.isOpenParen()) {
			this.next(true);
			const variables = this.loadCommaSeparated(() => this.parseExpression());
			if (this.activeToken && this.activeToken.isCloseParen()) this.next(true);
			return { variables, kind: SyntaxKind.MULTIPLE_VARIABLE_SET } as MultiSet;
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
				left: rootNode,
				operator: [colonToken],
				right: this.parseValue(),
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
		const binaryOperator: BinaryOperator = {
			kind: SyntaxKind.BINARY_OPERATOR,
			operator: [this.activeToken],
		};
		if (!this.next(true)) return binaryOperator;
		let operator: Operator | undefined;
		do {
			operator = getBinaryOperator(this.activeToken.value);
			if (!operator) break;
			if (operator) {
				const not = operator.value === OPERATOR_VALUE.NOT_LITERAL
					|| operator.value === OPERATOR_VALUE.APOSTROPHE;
				if (not && binaryOperator.operator.length) break;
			}
			binaryOperator.operator.push(this.activeToken);
			this.next(true);
		} while (operator && operator.appendable);
		return binaryOperator;
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
		if (!this.activeToken) {
			return {
				id: new Token(Type.Undefined, '', { character: 0, line: 0 }),
				kind: SyntaxKind.IDENTIFIER,
				unaryOperator,
			};
		}
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
				kind: SyntaxKind.BINARY_OPERATOR,
				left: value,
				operator: [this.activeToken],
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
	if (!node) return;
	switch (node.kind) {
		case SyntaxKind.DO_STATEMENT:
		case SyntaxKind.IF_STATEMENT:
		case SyntaxKind.QUIT_STATEMENT:
		case SyntaxKind.RETURN_STATEMENT:
		case SyntaxKind.SET_STATEMENT:
		case SyntaxKind.WHILE_STATEMENT:
		case SyntaxKind.FOR_STATEMENT:
		case SyntaxKind.CATCH_STATEMENT:
		case SyntaxKind.TYPE_STATEMENT:
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
			if (left && left.kind === SyntaxKind.MULTIPLE_VARIABLE_SET) {
				(left as MultiSet).variables.forEach(n => {
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
		case SyntaxKind.TYPE_IDENTIFIER:
			goDeeper = f(node);
			if (!goDeeper) return;
			const identifier = node as Identifier;
			if (identifier.args) identifier.args.forEach(arg => forEachChild(arg, f));
			break;
		case SyntaxKind.VARIABLE_DECLARATION:
			goDeeper = f(node);
			if (!goDeeper) return;
			const declaration = node as Declaration;
			if (declaration.args) declaration.args.forEach(arg => forEachChild(arg, f));
			f(declaration.type);
		case SyntaxKind.NUMERIC_LITERAL:
		case SyntaxKind.STRING_LITERAL:
			f(node);
			break;
		default:
			break;
	}
}
