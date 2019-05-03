import * as parser from '../src/parser/parser';
import * as tokenizer from '../src/parser/tokenizer';

function getMethod(methodString: string): parser.Method | undefined {
	const d = parser.parseText(methodString);
	return d.methods[0];
}
function getParsedDoc(documentString: string): parser.ParsedDocument {
	return parser.parseText(documentString);
}

function toValues(tokens: tokenizer.Token[]): string[] {
	return tokens.map(t => t.value);
}

function argsToValues(args: parser.Parameter[]): string[][] {
	return args.map(a => a.types).map(ts => toValues(ts));
}

function argsToNames(args: parser.Parameter[]): string[] {
	return toValues(args.map(a => a.id));
}

describe('Batch label', () => {
	const batchText = `---------- OPEN ------ Section marker

	type public Boolean ER
	type public Number BRCD
	type public String ET, RM

	do SOURCE^BCHSOURC("BOFF", "ACCUPD", .%UserID, .BRCD, .%UserClass)

	// ~p1 source not set up
	if ER set RM = $$^MSG(1184,"BOFF-ACCUPD"), %BatchExit = 1 do EXC quit`;

	const d = getParsedDoc(batchText);
	expect(d.methods).toHaveLength(1);
});

describe('Method Identifiers', () => {
	test('inline label statement symbol', () => {
		const methodString = 'label do something^SOMETHING';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		// let identifierValues = toValues(result.modifiers)
		expect(result.id.value).toEqual('label');
	});
	test('inline label statement keyword', () => {
		const methodString = 'label do something()';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		// let identifierValues = toValues(result.modifiers)
		expect(result.id.value).toEqual('label');
	});
	test('1 argument', () => {
		const methodString = 'public static void main(String args)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const identifierValues = toValues(result.modifiers);
		expect(identifierValues).toEqual(['public', 'static']);
	});

	test('2 arguments', () => {
		const methodString = 'public static void main(String arg1, String arg2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const identifierValues = toValues(result.modifiers);
		expect(identifierValues).toEqual(['public', 'static']);
	});

	test('Label', () => {
		const methodString = 'main';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		// let identifierValues = toValues(result.modifiers)
		expect(result.id.value).toEqual('main');
	});

	test('Label from document', () => {
		const methodString = 'main\r\n';
		const result = getParsedDoc(methodString);
		if (!result) {
			fail();
			return;
		}
		expect(result.methods[0].id.value).toEqual('main');
	});

	test('Label with line comment', () => {
		const methodString = 'main // a comment';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		toValues(result.modifiers);
		expect(result.id.value).toEqual('main');
	});

	test('Label with parens', () => {
		const methodString = 'main()';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		toValues(result.modifiers);
		expect(result.id.value).toEqual('main');
	});

	test('Label with 1 argument', () => {
		const methodString = 'main(String x1)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		toValues(result.modifiers);
		expect(result.id.value).toEqual('main');
	});

	test('Label with 2 arguments', () => {
		const methodString = 'main(String x1, String x2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		toValues(result.modifiers);
		expect(result.id.value).toEqual('main');
	});

	test('Label with 2 arguments multiline', () => {
		const methodString = 'main(String x1\n\t, String x2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		toValues(result.modifiers);
		expect(result.id.value).toEqual('main');
	});

	test('percent', () => {
		const methodString = 'public %main()';
		const method = getMethod(methodString);
		expect(method.id.value).toEqual('%main');
	});
});

describe('Argument Names', () => {

	test('1 argument', () => {
		const methodString = 'public static void main(String x1)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1']);
	});

	test('2 arguments', () => {
		const methodString = 'public static void main(String x1, String x2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1', 'x2']);
	});

	test('1 argument multiline', () => {
		const methodString = 'public static void main(\n\tString x1)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1']);
	});

	test('2 argument multiline', () => {
		const methodString = 'public static void main(String x1,\n\tString x2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1', 'x2']);
	});

	test('1 argument multitype', () => {
		const methodString = 'public static void main(void x1(Integer, Record))';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1']);
	});

	test('2 argument multitype', () => {
		const methodString = 'public static void main(void x1(Integer, Record), void x2(void, String))';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1', 'x2']);
	});

	test('2 argument multitype', () => {
		const methodString = 'public static void main(void x1(Integer, Record)\n\t, void x2(void, String))';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1', 'x2']);
	});

	test('test label with parens 1 arg', () => {
		const methodString = 'main(String x1)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argNameValues = argsToNames(result.parameters);
		expect(argNameValues).toEqual(['x1']);
	});

	test('Label no args', () => {
		const methodString = 'main';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const args = result.parameters;
		expect(args).toHaveLength(0);
	});

	test('Label with parens no args', () => {
		const methodString = 'main()';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const args = result.parameters;
		expect(args).toHaveLength(0);
	});

	test('Label with multiline parens no args', () => {
		const methodString = 'main(\n\t)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const args = result.parameters;
		expect(args).toHaveLength(0);
	});
});

describe('Argument Types', () => {
	test('1 argument', () => {
		const methodString = 'public static void main(String x1)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argValues = argsToValues(result.parameters);
		expect(argValues).toEqual([['String']]);
	});

	test('1 argument multitype', () => {
		const methodString = 'public static void main(String x1(Number))';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argValues = argsToValues(result.parameters);
		expect(argValues).toEqual([['String', 'Number']]);
	});

	test('test 2 argument types newline', () => {
		const methodString = 'public static void main(String x1 \n\t, Number x2)';
		const result = getMethod(methodString);
		if (!result) {
			fail();
			return;
		}
		const argValues = argsToValues(result.parameters);
		expect(argValues).toEqual([['String'], ['Number']]);
	});

	test('test 1 argument 3 types newline', () => {
		const methodString = 'public static void main(void x1(Integer, Record))';
		const result = getMethod(methodString);
		if (!result) {
			fail('Did not parse');
			return;
		}
		const argValues = argsToValues(result.parameters);
		expect(argValues).toEqual([['void', 'Integer', 'Record']]);
	});

	test('test 2 argument 3 types newline', () => {
		const methodString = 'public static void main(void x1(Integer, Record), void x2(void, String))';
		const result = getMethod(methodString);
		if (!result) {
			fail('Did not parse');
			return;
		}
		const argValues = argsToValues(result.parameters);
		expect(argValues).toEqual([['void', 'Integer', 'Record'], ['void', 'void', 'String']]);
	});
});

describe('Propertydefs', () => {
	test('empty propertydef', () => {
		const propertyString = '\t#PROPERTYDEF';
		const doc = getParsedDoc(propertyString);
		expect(doc.properties).toHaveLength(0);
	});

	test('one word propertydef', () => {
		const propertyString = '\t#PROPERTYDEF test';
		const doc = getParsedDoc(propertyString);
		expect(doc.properties).toHaveLength(1);
	});
});

test('parse document method count', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
public final Number toNumber()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
public final String toString(String vMask)
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.methods).toHaveLength(3);
});

test('parse extends', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.extending.value).toBe('Primitive');
});

test('parse psl package', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.pslPackage).toBe('custom.core');
});

test('parse numerical method', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */


	// --------------------------------------------------------------------
public final Integer 900()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.methods[0].id.value).toBe('900');
});

test('parse document method location', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
public final Number toNumber()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
public final String toString(String vMask)
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.methods.map(method => method.line)).toEqual([9, 18, 27]);
});

test('labels in document', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */



toInteger
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
toNumber
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
toString
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.methods.map(method => method.id.value)).toEqual(['toInteger', 'toNumber', 'toString']);
	expect(doc.methods.map(method => method.line)).toEqual([9, 18, 27]);
});

test('parse methods with propertydef', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */

	#PROPERTYDEF test class = String node = 1 public


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
public final Number toNumber()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
public final String toString(String vMask)
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.methods).toHaveLength(3);
});

test('parse methods with propertydef count', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */

	#PROPERTYDEF test class = String node = 1 public


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
public final Number toNumber()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
public final String toString(String vMask)
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(doc.properties).toHaveLength(1);

});

test('parse methods with propertydef count', () => {
	const documentString = `	#PACKAGE custom.core
	#CLASSDEF extends = Primitive public

	/*DOC -----------------------------------------------------------------
	Auto-generated by vscode-psl
	** ENDDOC */

	#PROPERTYDEF test class = String node = 1 public


	// --------------------------------------------------------------------
public final Integer toInteger()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Integer
	** ENDDOC */
	do prim2prim^UCPRIM("Integer")
	quit


	// --------------------------------------------------------------------
public final Number toNumber()
	/*DOC -----------------------------------------------------------------
	convert Boolean to Number
	** ENDDOC */
	do prim2prim^UCPRIM("Number")
	quit


	// --------------------------------------------------------------------
public final String toString(String vMask)
	/*DOC -----------------------------------------------------------------
	convert Boolean to String
	** ENDDOC */
	do insMet^UCMETHOD("$$toString^PslNllBoolean(",1)
	quit
`;

	const doc = getParsedDoc(documentString);
	expect(toValues(doc.properties[0].modifiers)).toEqual(['public']);
	expect(doc.properties[0].id.value).toEqual('test');

});

describe('type declarations', () => {
	test('basic type declaration', () => {
		const declarationString = '\ttype public literal String x = "hi there"';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('String');
		expect(doc.declarations[0].id.value).toEqual('x');
	});
	test('mutliple type declaration', () => {
		const declarationString = '\ttype public literal String x,y';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('String');
		expect(doc.declarations[0].id.value).toEqual('x');
		expect(doc.declarations[1].types[0].value).toEqual('String');
		expect(doc.declarations[1].id.value).toEqual('y');
	});
	test('mutliple multitype type declaration', () => {
		const declarationString = '\ttype public literal String x(Number,Boolean),y';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('String');
		expect(doc.declarations[0].types[1].value).toEqual('Number');
		expect(doc.declarations[0].types[2].value).toEqual('Boolean');
		expect(doc.declarations[0].id.value).toEqual('x');
		expect(doc.declarations[1].types[0].value).toEqual('String');
		expect(doc.declarations[1].id.value).toEqual('y');
	});
	test('mutliple type declaration equal sign', () => {
		const declarationString = '\ttype String x = "hi", y = "hi"';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('String');
		expect(doc.declarations[0].id.value).toEqual('x');
		expect(doc.declarations[1].types[0].value).toEqual('String');
		expect(doc.declarations[1].id.value).toEqual('y');
	});
	test('static type declaration', () => {
		const declarationString = '\ttype static x';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('x');
		expect(doc.declarations[0].id.value).toEqual('x');
	});
	test('type type declaration', () => {
		const declarationString = '\ttype String type';
		const doc = getParsedDoc(declarationString);
		expect(doc.declarations[0].types[0].value).toEqual('String');
		expect(doc.declarations[0].id.value).toEqual('type');
	});

	test('method declarations', () => {
		const documentString = `
public static void main()
	type String x
	quit

public static void main2()
	type Number y
	quit
`;
		const doc = getParsedDoc(documentString);
		expect(doc.methods[0].declarations[0].id.value).toEqual('x');
		expect(doc.methods[1].declarations[0].id.value).toEqual('y');
	});
});
