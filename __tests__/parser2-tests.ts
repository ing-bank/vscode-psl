import { StatementParser, Value, BinaryOperator, SyntaxKind, Statement, Expression, Identifier, StringLiteral, NumericLiteral } from '../src/parser/parser2';
import { getTokens } from '../src/parser/tokenizer';

describe('recursive tests', () => {
	test('parse value', () => {
		let tokenizer = getTokens('alex');
		let parser = new StatementParser(tokenizer);
		let value = parser.parseValue() as Identifier;
		expect(value.id).toBe(parser.tokens[0]);
		expect(value.args).toBeUndefined();
	})
	test('parse string value', () => {
		let tokenizer = getTokens('"alex"');
		let parser = new StatementParser(tokenizer);
		let value = parser.parseValue() as StringLiteral;
		expect(value.id).toBe(parser.tokens[1]);
	})
	test('parse number value', () => {
		let tokenizer = getTokens('42');
		let parser = new StatementParser(tokenizer);
		let value = parser.parseValue() as NumericLiteral;
		expect(value.id).toBe(parser.tokens[0]);
	})
	test('parse value with 0 args', () => {
		let tokenizer = getTokens('alex()');
		let parser = new StatementParser(tokenizer);
		let alex = parser.parseValue() as Identifier;
		let args = alex.args as Value[];
		expect(alex.id).toBe(parser.tokens[0]);
		expect(args.length).toBe(0);
	})
	test('parse value with 1 arg', () => {
		let tokenizer = getTokens('alex(ioana)');
		let parser = new StatementParser(tokenizer);
		let alex = parser.parseValue() as Identifier;
		let args = alex.args as Value[];
		expect(alex.id).toBe(parser.tokens[0]);
		expect(args[0].id).toBe(parser.tokens[2]);
	})
	test('parse value with 1 arg as expression', () => {
		let tokenizer = getTokens('alex(ioana)');
		let parser = new StatementParser(tokenizer);
		let alex = parser.parseExpression() as Identifier;
		let args = alex.args as Value[];
		expect(alex.id).toBe(parser.tokens[0]);
		expect(args[0].id).toBe(parser.tokens[2]);
	})
	test('parse value with 2 args', () => {
		let tokenizer = getTokens('alex(ioana,chris)');
		let parser = new StatementParser(tokenizer);
		let alex = parser.parseExpression() as Identifier;
		let args = alex.args as Identifier[];
		expect(alex.id).toBe(parser.tokens[0]);
		expect(args[0].id).toBe(parser.tokens[2]);
		expect(args[1].id).toBe(parser.tokens[4]);
	})
	test('parse args', () => {
		let tokenizer = getTokens('  a,  b  ');
		let parser = new StatementParser(tokenizer);
		let args = parser.parseArgs() as Value[];
		expect(args[0].id).toBe(parser.tokens[2])
		expect(args[1].id).toBe(parser.tokens[6])
	})
	test('parse arg', () => {
		let tokenizer = getTokens('a');
		let parser = new StatementParser(tokenizer);
		let args = parser.parseArgs() as Value[];
		expect(args[0].id).toBe(parser.tokens[0])
	})
	test('parse value with 2 args with spaces', () => {
		let tokenizer = getTokens('alex( ioana , chris)');
		let parser = new StatementParser(tokenizer);
		let alex = parser.parseValue() as Identifier;
		let args = alex.args as Value[];
		expect(alex.id.value).toBe('alex');
		expect(args[0].id.value).toBe('ioana');
		expect(args[1].id.value).toBe('chris');
	})
	test('child', () => {
		let tokenizer = getTokens('Runtime.start');
		let parser = new StatementParser(tokenizer);
		let dotNode = parser.parseExpression() as BinaryOperator;
		let runtime = dotNode.left as Value;
		let start = dotNode.right as Value;
		expect(dotNode.operator).toBe(parser.tokens[1]);
		expect(runtime.id).toBe(parser.tokens[0]);
		expect(start.id).toBe(parser.tokens[2]);
	})
	test('Runtime start', () => {
		let tokenizer = getTokens('Runtime.start("BA",varlist)');
		let parser = new StatementParser(tokenizer);
		let dotNode = parser.parseExpression() as BinaryOperator;
		let runtime = dotNode.left as Identifier;
		let start = dotNode.right as Identifier;
		let args = start.args as Value[];
		let ba = args[0];
		let varlist = args[1];
		expect(dotNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(runtime.id).toBe(parser.tokens[0]);
		expect((start).id).toBe(parser.tokens[2]);
		expect(ba.id).toBe(parser.tokens[5]);
		expect(varlist.id).toBe(parser.tokens[8]);
	})
	test('grandchild', () => {
		let tokenizer = getTokens('a.b.c');
		let parser = new StatementParser(tokenizer);
		let rootNode = parser.parseExpression() as BinaryOperator;
		let leftTree = rootNode.left as BinaryOperator;
		let a = leftTree.left as Value;
		let b = leftTree.right as Value;
		let c = rootNode.right as Value;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id).toBe(parser.tokens[0]);
		expect(b.id).toBe(parser.tokens[2]);
		expect(c.id).toBe(parser.tokens[4]);
	})
	test('grandchild with args', () => {
		let tokenizer = getTokens('a(x).b(y).c(z)');
		let parser = new StatementParser(tokenizer);
		let rootNode = parser.parseExpression() as BinaryOperator;
		let leftTree = rootNode.left as BinaryOperator;
		let a = leftTree.left as Value;
		let b = leftTree.right as Value;
		let c = rootNode.right as Value;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id).toBe(parser.tokens[0]);
		expect(b.id).toBe(parser.tokens[5]);
		expect(c.id).toBe(parser.tokens[10]);
	})
	test('grandchild with Numeric args', () => {
		let tokenizer = getTokens('a(1).b(1).c(1)');
		let parser = new StatementParser(tokenizer);
		let rootNode = parser.parseExpression() as BinaryOperator;
		let leftTree = rootNode.left as BinaryOperator;
		let a = leftTree.left as Value;
		let b = leftTree.right as Value;
		let c = rootNode.right as Value;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id).toBe(parser.tokens[0]);
		expect(b.id).toBe(parser.tokens[5]);
		expect(c.id).toBe(parser.tokens[10]);
	})
	test('parse do statement', () => {
		let tokenizer = getTokens('do x(y.z)');
		let parser = new StatementParser(tokenizer);
		
		let statement = parser.parseStatement() as Statement;
		let x = statement.expression as Identifier;
		let args = x.args as Expression[];
		let dot = args[0] as BinaryOperator;
		let y = dot.left as Value;
		let z = dot.right as Value;
		
		expect(statement.action.value).toBe("do");
		expect(x.id.value).toBe("x");
		expect(y.id.value).toBe("y");
		expect(z.id.value).toBe("z");
	})
	// test('parse arg', () => {
	// 	let tokenizer = getTokens('(alex)');
	// 	let parser = new Parser(tokenizer);
	// 	let parsed = parseArgs(tokens);
	// 	expect(parsed.args[0].id).toBe(tokens[1]);
	// })
	// test('parse 2 args', () => {
	// 	let tokenizer = getTokens('(alex,ioana)');
	// 	let parser = new Parser(tokenizer);
	// 	let parsed = parseArgs(tokens);
	// 	expect(parsed.args[0].id).toBe(tokens[1]);
	// 	expect(parsed.args[1].id).toBe(tokens[3]);
	// })
	// test('parse 3 args', () => {
	// 	let tokenizer = getTokens('(alex,ioana,chris)');
	// 	let parser = new Parser(tokenizer);
	// 	let parsed = parseArgs(tokens);
	// 	expect(parsed.args[0].id).toBe(tokens[1]);
	// 	expect(parsed.args[1].id).toBe(tokens[3]);
	// 	expect(parsed.args[2].id).toBe(tokens[5]);
	// })
})
