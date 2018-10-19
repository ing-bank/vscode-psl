import {
	BinaryOperator, Declaration, Expression, Identifier, NumericLiteral, PostCondition,
	Statement, StatementParser, StringLiteral, SyntaxKind, Value,
} from '../src/parser/statementParser';
import { getTokens } from '../src/parser/tokenizer';

function parse(text: string) {
	return new StatementParser(getTokens(text));
}

describe('recursive tests', () => {
	test('parse value', () => {
		const parser = parse('alex');
		const value = parser.parseValue() as Identifier;
		expect(value.id.value).toBe('alex');
		expect(value.args).toBeUndefined();
		expect(value.openParen).toBeUndefined();
		expect(value.closeParen).toBeUndefined();
	});
	test('parse string value', () => {
		const parser = parse('"alex"');
		const value = parser.parseValue() as StringLiteral;
		expect(value.id.value).toBe('alex');
	});
	test('parse number value', () => {
		const parser = parse('42');
		const value = parser.parseValue() as NumericLiteral;
		expect(value.id.value).toBe('42');
	});
	test('parse complex value', () => {
		const parser = parse('(a.b()_c)');
		const value = parser.parseValue() as BinaryOperator;
		expect(value.operator[0].value).toBe('_');
	});
	test('parse value with 0 args', () => {
		const parser = parse('alex()');
		const alex = parser.parseValue() as Identifier;
		const args = alex.args as Value[];
		expect(alex.id.value).toBe('alex');
		expect(args.length).toBe(0);
		expect(alex.openParen).not.toBeUndefined();
		expect(alex.closeParen).not.toBeUndefined();
	});
	test('parse value with 1 arg', () => {
		const parser = parse('alex(ioana)');
		const alex = parser.parseValue() as Identifier;
		const args = alex.args as Value[];
		expect(alex.id.value).toBe('alex');
		expect(args[0].id.value).toBe('ioana');
	});
	test('parse value with 1 arg as expression', () => {
		const parser = parse('alex(ioana)');
		const alex = parser.parseExpression() as Identifier;
		const args = alex.args as Value[];
		expect(alex.id.value).toBe('alex');
		expect(args[0].id.value).toBe('ioana');
	});
	test('parse value with 2 args', () => {
		const parser = parse('alex(ioana,chris)');
		const alex = parser.parseExpression() as Identifier;
		const args = alex.args as Identifier[];
		expect(alex.id.value).toBe('alex');
		expect(args[0].id.value).toBe('ioana');
		expect(args[1].id.value).toBe('chris');
	});
	test('parse args', () => {
		const parser = parse('  a,  b  ');
		const args = parser.parseArgs() as Value[];
		expect(args[0].id.value).toBe('a');
		expect(args[1].id.value).toBe('b');
	});
	test('parse arg', () => {
		const parser = parse('a');
		const args = parser.parseArgs() as Value[];
		expect(args[0].id.value).toBe('a');
	});
	test('parse value with 2 args with spaces', () => {
		const parser = parse('alex( ioana , chris)');
		const alex = parser.parseValue() as Identifier;
		const args = alex.args as Value[];
		expect(alex.id.value).toBe('alex');
		expect(args[0].id.value).toBe('ioana');
		expect(args[1].id.value).toBe('chris');
	});
	test('child', () => {
		const parser = parse('a + b');
		const plus = parser.parseExpression() as BinaryOperator;
		const a = plus.left as Identifier;
		const b = plus.right as Identifier;
		expect(plus.operator[0].value).toBe('+');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
	});
	test('double token operator', () => {
		const parser = parse('a <= b');
		const plus = parser.parseExpression() as BinaryOperator;
		const a = plus.left as Identifier;
		const b = plus.right as Identifier;
		expect(plus.operator[0].value).toBe('<');
		expect(plus.operator[1].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
	});
	test('dot operator precedence', () => {
		const parser = parse('a.b < x.y');
		const lessThan = parser.parseExpression() as BinaryOperator;
		const aDot = lessThan.left as BinaryOperator;
		const a = aDot.left as Identifier;
		const b = aDot.right as Identifier;
		const xDot = lessThan.right as BinaryOperator;
		const x = xDot.left as Identifier;
		const y = xDot.right as Identifier;
		expect(lessThan.operator[0].value).toBe('<');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
	});
	test('child', () => {
		const parser = parse('Runtime.start');
		const dotNode = parser.parseExpression() as BinaryOperator;
		const runtime = dotNode.left as Identifier;
		const start = dotNode.right as Identifier;
		expect(dotNode.operator[0]).toBe(parser.tokens[1]);
		expect(runtime.id).toBe(parser.tokens[0]);
		expect(start.id).toBe(parser.tokens[2]);
	});
	test('Runtime start', () => {
		const parser = parse('Runtime.start("BA",varlist)');
		const dotNode = parser.parseExpression() as BinaryOperator;
		const runtime = dotNode.left as Identifier;
		const start = dotNode.right as Identifier;
		const args = start.args as Value[];
		const ba = args[0];
		const varlist = args[1];
		expect(dotNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(runtime.id).toBe(parser.tokens[0]);
		expect((start).id).toBe(parser.tokens[2]);
		expect(ba.id).toBe(parser.tokens[5]);
		expect(varlist.id).toBe(parser.tokens[8]);
	});
	test('grandchild', () => {
		const parser = parse('a.b.c');
		const rootNode = parser.parseExpression() as BinaryOperator;
		const leftTree = rootNode.left as BinaryOperator;
		const a = leftTree.left as Identifier;
		const b = leftTree.right as Identifier;
		const c = rootNode.right as Identifier;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
		expect(c.id.value).toBe('c');
	});
	test('grandchild with args', () => {
		const parser = parse('a(x).b(y).c(z)');
		const rootNode = parser.parseExpression() as BinaryOperator;
		const leftTree = rootNode.left as BinaryOperator;
		const a = leftTree.left as Identifier;
		const b = leftTree.right as Identifier;
		const c = rootNode.right as Identifier;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id).toBe(parser.tokens[0]);
		expect(b.id).toBe(parser.tokens[5]);
		expect(c.id).toBe(parser.tokens[10]);
	});
	test('grandchild with Numeric args', () => {
		const parser = parse('a(1).b(1).c(1)');
		const rootNode = parser.parseExpression() as BinaryOperator;
		const leftTree = rootNode.left as BinaryOperator;
		const a = leftTree.left as Identifier;
		const b = leftTree.right as Identifier;
		const c = rootNode.right as Identifier;
		expect(rootNode.kind === SyntaxKind.BINARY_OPERATOR);
		expect(leftTree.kind === SyntaxKind.BINARY_OPERATOR);
		expect(a.id).toBe(parser.tokens[0]);
		expect(b.id).toBe(parser.tokens[5]);
		expect(c.id).toBe(parser.tokens[10]);
	});
	test('parse do statement', () => {
		const parser = parse('do x(y.z)');

		const statement = parser.parseStatement() as Statement;
		const x = statement.expressions[0] as Identifier;
		const args = x.args as Expression[];
		const dot = args[0] as BinaryOperator;
		const y = dot.left as Identifier;
		const z = dot.right as Identifier;

		expect(statement.action.value).toBe('do');
		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
		expect(z.id.value).toBe('z');
	});
	test('parse set statement', () => {
		const parser = parse('set x = y');

		const statement = parser.parseStatement() as Statement;
		const equal = statement.expressions[0] as BinaryOperator;
		const x = equal.left as Identifier;
		const y = equal.right as Identifier;

		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
	});
	test('parse set statement2', () => {
		const parser = parse('set x = y');

		const statement = parser.parseStatement() as Statement;
		const equal = statement.expressions[0] as BinaryOperator;
		const x = equal.left as Identifier;
		const y = equal.right as Identifier;

		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
	});
	test('parse set prop statement', () => {
		const parser = parse('set x.y = z');

		const statement = parser.parseStatement() as Statement;
		const equal = statement.expressions[0] as BinaryOperator;
		const dot = equal.left as BinaryOperator;
		const x = dot.left as Identifier;
		const y = dot.right as Identifier;
		const z = equal.right as Identifier;

		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
		expect(z.id.value).toBe('z');
	});
	test('parse multi set', () => {
		const parser = parse('set a = b, x = y');

		const setStatement = parser.parseStatement() as Statement;
		const aEqual = setStatement.expressions[0] as BinaryOperator;
		const a = aEqual.left as Identifier;
		const b = aEqual.right as Identifier;
		const xEqual = setStatement.expressions[1] as BinaryOperator;
		const x = xEqual.left as Identifier;
		const y = xEqual.right as Identifier;

		expect(setStatement.action.value).toBe('set');
		expect(aEqual.operator[0].value).toBe('=');
		expect(xEqual.operator[0].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
	});
	test('parse set to complex expression', () => {
		const parser = parse('set a = x(y,z)');

		const statement = parser.parseStatement() as Statement;
		const equal1 = statement.expressions[0] as BinaryOperator;

		const a = equal1.left as Identifier;
		const x = equal1.right as Identifier;
		const xArgs = x.args as Identifier[];
		const y = xArgs[0] as Identifier;
		const z = xArgs[1] as Identifier;

		expect(statement.action.value).toBe('set');
		expect(a.id.value).toBe('a');
		expect(x.id.value).toBe('x');
		expect(xArgs.length).toBe(2);
		expect(y.id.value).toBe('y');
		expect(z.id.value).toBe('z');
	});
	test('multi variable set', () => {
		const parser = parse('set (a,b) = c');

		const statement = parser.parseStatement() as Statement;
		const equal = statement.expressions[0] as BinaryOperator;
		const variables = equal.left as Identifier[];
		const a = variables[0] as Identifier;
		const b = variables[1] as Identifier;
		const c = equal.right as Identifier;

		expect(statement.action.value).toBe('set');
		expect(equal.operator[0].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
		expect(c.id.value).toBe('c');
	});
	test('multi variable set', () => {
		const parser = parse('set (a.x,b.y) = c, i = j');

		const statement = parser.parseStatement() as Statement;
		const equal1 = statement.expressions[0] as BinaryOperator;
		const variables = equal1.left as Expression[];
		const dot1 = variables[0] as BinaryOperator;
		const a = dot1.left as Identifier;
		const x = dot1.right as Identifier;
		const dot2 = variables[1] as BinaryOperator;
		const b = dot2.left as Identifier;
		const y = dot2.right as Identifier;
		const c = equal1.right as Identifier;

		const equal2 = statement.expressions[1] as BinaryOperator;
		const i = equal2.left as Identifier;
		const j = equal2.right as Identifier;

		expect(statement.action.value).toBe('set');
		expect(equal1.operator[0].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(x.id.value).toBe('x');
		expect(b.id.value).toBe('b');
		expect(y.id.value).toBe('y');
		expect(c.id.value).toBe('c');
		expect(i.id.value).toBe('i');
		expect(j.id.value).toBe('j');

		expect(c.id.value).toBe('c');
	});
	test('parse set and do', () => {
		const parser = parse('set a = b do c()');

		const statements = parser.parseLine();
		const setStatement = statements[0];
		const equal = setStatement.expressions[0] as BinaryOperator;
		const a = equal.left as Identifier;
		const b = equal.right as Identifier;
		const doStatment = statements[1];
		const c = doStatment.expressions[0] as Identifier;

		expect(setStatement.action.value).toBe('set');
		expect(equal.operator[0].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
		expect(c.id.value).toBe('c');
	});
	test('parse if set', () => {
		const parser = parse('if x set y = z');

		const statements = parser.parseLine();
		const ifStatement = statements[0];
		const setStatement = statements[1];
		const x = ifStatement.expressions[0] as Identifier;
		const equal = setStatement.expressions[0] as BinaryOperator;
		const y = equal.left as Identifier;
		const z = equal.right as Identifier;
		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
		expect(z.id.value).toBe('z');
	});
	test('parse complex if set', () => {
		const parser = parse('if ((x > y) and z.isNotNull()) set a = b');

		const statements = parser.parseLine();
		const ifStatement = statements[0];
		const setStatement = statements[1];
		const and = ifStatement.expressions[0] as BinaryOperator;
		const greaterThan = and.left as BinaryOperator;
		const x = greaterThan.left as Identifier;
		const y = greaterThan.right as Identifier;
		const dot = and.right as BinaryOperator;
		const z = dot.left as Identifier;
		const isNotNull = dot.right as Identifier;
		const equal = setStatement.expressions[0] as BinaryOperator;
		const a = equal.left as Identifier;
		const b = equal.right as Identifier;

		expect(and.operator[0].value).toBe('and');
		expect(greaterThan.operator[0].value).toBe('>');
		expect(x.id.value).toBe('x');
		expect(y.id.value).toBe('y');
		expect(dot.operator[0].value).toBe('.');
		expect(z.id.value).toBe('z');
		expect(isNotNull.id.value).toBe('isNotNull');
		expect(equal.operator[0].value).toBe('=');
		expect(a.id.value).toBe('a');
		expect(b.id.value).toBe('b');
	});
	test('test unary operator', () => {
		const parser = parse('set x = $$LABEL^PROC');

		const equal = parser.parseStatement().expressions[0] as BinaryOperator;
		const carrot = equal.right as BinaryOperator;
		const label = carrot.left as Identifier;
		const proc = carrot.right as Identifier;

		expect(equal.operator[0].value).toBe('=');
		expect(carrot.operator[0].value).toBe('^');
		expect(label.id.value).toBe('LABEL');
		expect(label.unaryOperator.map(o => o.value).join('')).toBe('$$');
		expect(proc.id.value).toBe('PROC');
	});
	test('test unary and operator', () => {
		const parser = parse('if x and not y');

		const and = parser.parseStatement().expressions[0] as BinaryOperator;
		const y = and.right as Identifier;
		expect(and.operator.map(o => o.value).join(' ')).toBe('and');
		expect(y.id.value).toBe('y');
		expect(y.unaryOperator.map(o => o.value).join(' ')).toBe('not');
	});
	test('many statements', () => {
		const parser = parse('if x.isNotNull() and (y <= (z+3)) set a = "19900415".toDate() do b.func()');

		const statements = parser.parseLine();
		const ifStatement = statements[0];
		const setStatement = statements[1];
		const doStatement = statements[2];
		const and = ifStatement.expressions[0] as BinaryOperator;
		const xDot = and.left as BinaryOperator;
		const x = xDot.left as Identifier;
		const isNotNull = xDot.right as Identifier;
		const lessThanEqualTo = and.right as BinaryOperator;
		const y = lessThanEqualTo.left as Identifier;
		const plus = lessThanEqualTo.right as BinaryOperator;
		const z = plus.left as Identifier;
		const three = plus.right as NumericLiteral;
		const equal = setStatement.expressions[0] as BinaryOperator;
		const a = equal.left as Identifier;
		const stringDot = equal.right as BinaryOperator;
		const dobString = stringDot.left as StringLiteral;
		const toDate = stringDot.right as Identifier;
		const bDot = doStatement.expressions[0] as BinaryOperator;
		const b = bDot.left as Identifier;
		const func = bDot.right as Identifier;

		expect(ifStatement.action.value).toBe('if');
		expect(x.id.value).toBe('x');
		expect(xDot.operator.map(o => o.value).join('')).toBe('.');
		expect(isNotNull.id.value).toBe('isNotNull');
		expect(and.operator.map(o => o.value).join('')).toBe('and');
		expect(y.id.value).toBe('y');
		expect(lessThanEqualTo.operator.map(o => o.value).join('')).toBe('<=');
		expect(z.id.value).toBe('z');
		expect(plus.operator.map(o => o.value).join('')).toBe('+');
		expect(three.id.value).toBe('3');
		expect(setStatement.action.value).toBe('set');
		expect(a.id.value).toBe('a');
		expect(equal.operator.map(o => o.value).join('')).toBe('=');
		expect(dobString.id.value).toBe('19900415');
		expect(stringDot.operator.map(o => o.value).join('')).toBe('.');
		expect(toDate.id.value).toBe('toDate');
		expect(doStatement.action.value).toBe('do');
		expect(b.id.value).toBe('b');
		expect(bDot.operator.map(o => o.value).join('')).toBe('.');
		expect(func.id.value).toBe('func');
	});
	test('catch with colon', () => {
		const parser = parse('catch a@"b":c = d');
		const catchStatement = parser.parseStatement();
		const colon = catchStatement.expressions[0] as BinaryOperator;
		expect(colon.operator.map(o => o.value).join('')).toBe(':');
	});
	test('set with colon', () => {
		const parser = parse('set:x=ER (x,y)=1');
		const setStatement = parser.parseStatement();
		const postCondition = setStatement.expressions[0] as PostCondition;
		const postEqual = postCondition.condition as BinaryOperator;
		const assignEqual = postCondition.expression as BinaryOperator;
		expect(postEqual.operator.map(o => o.value).join('')).toBe('=');
		expect(postEqual.kind).toBe(SyntaxKind.BINARY_OPERATOR);
		expect(assignEqual.operator.map(o => o.value).join('')).toBe('=');
		expect(assignEqual.kind).toBe(SyntaxKind.ASSIGNMENT);
	});
	test('do with colon', () => {
		const parser = parse('do:x=ER logErr^LOG(msg)');
		const setStatement = parser.parseStatement();
		const postCondition = setStatement.expressions[0] as PostCondition;
		const postEqual = postCondition.condition as BinaryOperator;
		const carrot = postCondition.expression as BinaryOperator;
		expect(postEqual.operator.map(o => o.value).join('')).toBe('=');
		expect(postEqual.kind).toBe(SyntaxKind.BINARY_OPERATOR);
		expect(carrot.operator.map(o => o.value).join('')).toBe('^');
		expect(carrot.kind).toBe(SyntaxKind.BINARY_OPERATOR);
	});
	test('$select', () => {
		const parser = parse('set x = $select(ER:"error",true:"ok")');
		const setStatement = parser.parseStatement();
		const equal = setStatement.expressions[0] as BinaryOperator;
		const select = equal.right as Identifier;
		const arg1 = select.args[0] as BinaryOperator;
		expect(equal.operator.map(o => o.value).join('')).toBe('=');
		expect(arg1.operator.map(o => o.value).join('')).toBe(':');
	});
	test('for loop', () => {
		const parser = parse('for i=1:1:100');
		const setStatement = parser.parseStatement();
		const outsideColon = setStatement.expressions[0] as BinaryOperator;
		const oneHundred = outsideColon.right as NumericLiteral;
		const insideColon = outsideColon.left as BinaryOperator;
		const equal = insideColon.left as BinaryOperator;
		const increment = insideColon.right as NumericLiteral;
		const i = equal.left as Identifier;
		const initial = equal.right as NumericLiteral;
		expect(outsideColon.operator.map(o => o.value).join('')).toBe(':');
		expect(insideColon.operator.map(o => o.value).join('')).toBe(':');
		expect(oneHundred.id.value).toBe('100');
		expect(equal.operator.map(o => o.value).join('')).toBe('=');
		// expect(equal.kind).toBe(SyntaxKind.ASSIGNMENT);
		expect(increment.id.value).toBe('1');
		expect(i.id.value).toBe('i');
		expect(initial.id.value).toBe('1');
	});
	test('argumentless for loop', () => {
		const parser = parse('for  set x = 1');
		const statements = parser.parseLine();
		const forStatement = statements[0];
		const setStatement = statements[1];
		const equal = setStatement.expressions[0] as BinaryOperator;
		expect(forStatement.expressions.length).toBe(0);
		expect(equal.operator.map(o => o.value).join('')).toBe('=');
	});
	test('empty arg', () => {
		const parser = parse('do Runtime.start("CS",,ALERT)');
		const doStatement = parser.parseStatement();
		const dot = doStatement.expressions[0] as BinaryOperator;
		const start = dot.right as Identifier;
		const args = start.args as Identifier[];
		expect(args.length).toBe(3);
	});
	test('for order', () => {
		const parser = parse('for  set seq=tras(seq).order() quit:seq.isNull()  do set(tras(seq))');
		const statements = parser.parseLine();
		const setStatement = statements[1];
		const equal = setStatement.expressions[0] as BinaryOperator;
		expect(equal.kind).toBe(SyntaxKind.ASSIGNMENT);
	});
	test('ret identifier', () => {
		const parser = parse('set ret.x = y');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		const equal = setStatement.expressions[0] as BinaryOperator;
		const dot = equal.left as BinaryOperator;
		const ret = dot.left as Identifier;
		expect(equal.kind).toBe(SyntaxKind.ASSIGNMENT);
		expect(ret.id.value).toBe('ret');
	});
	test('ret in args', () => {
		const parser = parse('do f(ret x)');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		const f = doStatement.expressions[0] as Identifier;
		const x = f.args[0] as Identifier;
		expect(f.id.value).toBe('f');
		expect(x.id.value).toBe('x');
		expect(x.unaryOperator[0].value).toBe('ret');
	});
	test('robust do', () => {
		const parser = parse('do x.');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		const dot = doStatement.expressions[0] as BinaryOperator;
		const x = dot.left as Identifier;
		expect(dot.operator[0].value).toBe('.');
		expect(x.id.value).toBe('x');
	});
	test('robust set', () => {
		const parser = parse('set x.');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		const dot = setStatement.expressions[0] as BinaryOperator;
		const x = dot.left as Identifier;
		expect(dot.operator[0].value).toBe('.');
		expect(x.id.value).toBe('x');
	});
	test('robust set', () => {
		const parser = parse('set x.');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		const dot = setStatement.expressions[0] as BinaryOperator;
		const x = dot.left as Identifier;
		expect(dot.operator[0].value).toBe('.');
		expect(x.id.value).toBe('x');
	});
	test('robust binary', () => {
		const parser = parse('do x_');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		const _ = doStatement.expressions[0] as BinaryOperator;
		const x = _.left as Identifier;
		expect(_.operator[0].value).toBe('_');
		expect(x.id.value).toBe('x');
	});

	test('empty quit', () => {
		const parser = parse('quit');
		const statements = parser.parseLine();
		const quitStatement = statements[0];
		expect(quitStatement.kind).toBe(SyntaxKind.QUIT_STATEMENT);
		expect(quitStatement.expressions.length).toBe(0);
	});
	test('empty quit with colol', () => {
		const parser = parse('quit:');
		const statements = parser.parseLine();
		const quitStatement = statements[0];
		expect(quitStatement.kind).toBe(SyntaxKind.QUIT_STATEMENT);
		expect(quitStatement.expressions.length).toBe(1);
	});
	test('empty set', () => {
		const parser = parse('set');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
		expect(setStatement.expressions.length).toBe(0);
	});
	test('empty do', () => {
		const parser = parse('do');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		expect(doStatement.kind).toBe(SyntaxKind.DO_STATEMENT);
		expect(doStatement.expressions.length).toBe(0);
	});
	test('empty set with new line', () => {
		const parser = parse('set\r\n');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
		expect(setStatement.expressions.length).toBe(0);
	});
	test('empty quit with new line', () => {
		const parser = parse('quit\r\n');
		const statements = parser.parseLine();
		const quitStatement = statements[0];
		expect(quitStatement.kind).toBe(SyntaxKind.QUIT_STATEMENT);
		expect(quitStatement.expressions.length).toBe(0);
	});
	test('empty do with new line', () => {
		const parser = parse('do\r\n');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		expect(doStatement.kind).toBe(SyntaxKind.DO_STATEMENT);
		expect(doStatement.expressions.length).toBe(0);
	});
	test('do with only post condition', () => {
		const parser = parse('do:x');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		expect(doStatement.kind).toBe(SyntaxKind.DO_STATEMENT);
		expect(doStatement.expressions.length).toBe(1);
	});
	test('set with only post condition', () => {
		const parser = parse('set:x');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
		expect(setStatement.expressions.length).toBe(1);
	});
	test('set with only unary', () => {
		const parser = parse('set x = ^');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
		expect(setStatement.expressions.length).toBe(1);
	});
	test('set partial expression', () => {
		const parser = parse('set x. = "something" do');
		const statements = parser.parseLine();
		const setStatement = statements[0];
		const doStatement = statements[1];
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
		expect(setStatement.expressions.length).toBe(1);
		expect(doStatement.kind).toBe(SyntaxKind.DO_STATEMENT);
	});
	test('do partial expression', () => {
		const parser = parse('do x. set y = ""');
		const statements = parser.parseLine();
		const doStatement = statements[0];
		const setStatement = statements[1];
		expect(doStatement.kind).toBe(SyntaxKind.DO_STATEMENT);
		expect(doStatement.expressions.length).toBe(1);
		expect(setStatement.kind).toBe(SyntaxKind.SET_STATEMENT);
	});
	test('type statement', () => {
		const parser = parse('String x');
		const declaration = parser.parseTypeExpression() as Declaration;
		expect(declaration.type.value).toBe('String');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args).toBeUndefined();
	});
	test('type statement with arg', () => {
		const parser = parse('void x(Number)');
		const declaration = parser.parseTypeExpression() as Declaration;
		const arrayTypeNumber = declaration.args[0] as Identifier;
		expect(declaration.type.value).toBe('void');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args.length).toBe(1);
		expect(arrayTypeNumber.id.value).toBe('Number');
	});
	test('type statement with 2 arg', () => {
		const parser = parse('void x(Number, String)');
		const declaration = parser.parseTypeExpression() as Declaration;
		const arrayTypeNumber = declaration.args[0] as Identifier;
		const arrayTypeString = declaration.args[1] as Identifier;
		expect(declaration.type.value).toBe('void');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args.length).toBe(2);
		expect(arrayTypeNumber.id.value).toBe('Number');
		expect(arrayTypeString.id.value).toBe('String');
	});
	test('type statement with no arg', () => {
		const parser = parse('void x()');
		const declaration = parser.parseTypeExpression() as Declaration;
		expect(declaration.type.value).toBe('void');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args.length).toBe(0);
	});
	test('type statement with 2 empty args', () => {
		const parser = parse('void x(,)');
		const declaration = parser.parseTypeExpression() as Declaration;
		expect(declaration.type.value).toBe('void');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args.length).toBe(2);
	});
	test('type statement with assignment', () => {
		const parser = parse('String x = "something"');
		const assignment = parser.parseTypeExpression() as BinaryOperator;
		const declaration = assignment.left as Declaration;
		const something = assignment.right as StringLiteral;
		expect(declaration.type.value).toBe('String');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args).toBeUndefined();
		expect(something.id.value).toBe('something');
	});
	test('type statement with keywords', () => {
		const parser = parse('public new String x');
		const declaration = parser.parseTypeExpression() as Declaration;
		expect(declaration.type.value).toBe('String');
		expect(declaration.publicToken.value).toBe('public');
		expect(declaration.newToken.value).toBe('new');
		expect(declaration.id.value).toBe('x');
		expect(declaration.args).toBeUndefined();
	});
});
