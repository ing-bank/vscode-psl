import {getTokens, Type} from '../src/parser/tokenizer';

test('pipe token', () => {
	let tokenizer = getTokens('|');
	expect(tokenizer.next().value).toEqual({type: Type.Pipe, value: '|', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('property def', () => {
	let tokenizer = getTokens('#PROPERTYDEF');
	expect(tokenizer.next().value).toEqual({type: Type.NumberSign, value: '#', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'PROPERTYDEF', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toBeUndefined();
})


test('property def full', () => {
	let tokenizer = getTokens('\t#PROPERTYDEF dummy\t\t\tclass = String\tpublic position = 2');
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.NumberSign, value: '#', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'PROPERTYDEF', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 13}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'dummy', position: {line: 0, character: 14}});
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 19}});
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 20}});
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 21}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'class', position: {line: 0, character: 22}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 27}});
	expect(tokenizer.next().value).toEqual({type: Type.EqualSign, value: '=', position: {line: 0, character: 28}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 29}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'String', position: {line: 0, character: 30}});
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 36}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'public', position: {line: 0, character: 37}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 43}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'position', position: {line: 0, character: 44}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 52}});
	expect(tokenizer.next().value).toEqual({type: Type.EqualSign, value: '=', position: {line: 0, character: 53}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 54}});
	expect(tokenizer.next().value).toEqual({type: Type.Numeric, value: '2', position: {line: 0, character: 55}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('numeric', () => {
	let tokenizer = getTokens('1');
	expect(tokenizer.next().value).toEqual({type: Type.Numeric, value: '1', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('whitespace', () => {
	let tabTokenizer = getTokens('\t');
	expect(tabTokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 0}});
	expect(tabTokenizer.next().value).toBeUndefined();

	let spaceTokenizer = getTokens('  ');
	expect(spaceTokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 0}});
	expect(spaceTokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 1}});
	expect(spaceTokenizer.next().value).toBeUndefined();
})

test('line comment', () => {
	let tokenizer = getTokens('//line comment');
	expect(tokenizer.next().value).toEqual({type: Type.LineCommentInit, value: '//', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.LineComment, value: 'line comment', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('//line comment\nword');
	expect(tokenizer.next().value).toEqual({type: Type.LineCommentInit, value: '//', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.LineComment, value: 'line comment', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toEqual({type: Type.NewLine, value: '\n', position: {line: 0, character: 14}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'word', position: {line: 1, character: 0}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('///*line comment*/');
	expect(tokenizer.next().value).toEqual({type: Type.LineCommentInit, value: '//', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.LineComment, value: '/*line comment*/', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('//\n');
	expect(tokenizer.next().value).toEqual({type: Type.LineCommentInit, value: '//', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.LineComment, value: '', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toEqual({type: Type.NewLine, value: '\n', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('block comment', () => {
	let tokenizer = getTokens('/*a block* / comment*/ alphanumeric');
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentInit, value: '/*', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockComment, value: 'a block* / comment', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentTerm, value: '*/', position: {line: 0, character: 20}});
	expect(tokenizer.next().value).toEqual({type: Type.Space, value: ' ', position: {line: 0, character: 22}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'alphanumeric', position: {line: 0, character: 23}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('/**/');
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentInit, value: '/*', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockComment, value: '', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentTerm, value: '*/', position: {line: 0, character: 2}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('documentation block comment', () => {
	let tokenizer = getTokens('\t/*DOC -----------------------------------------------------------------\n\tdocumentation\n\t** ENDDOC */');
	expect(tokenizer.next().value).toEqual({type: Type.Tab, value: '\t', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentInit, value: '/*', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockComment, value: 'DOC -----------------------------------------------------------------\n\tdocumentation\n\t** ENDDOC ', position: {line: 0, character: 3}});
	expect(tokenizer.next().value).toEqual({type: Type.BlockCommentTerm, value: '*/', position: {line: 2, character: 11}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('string', () => {
	let tokenizer = getTokens('"this is a string"');
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.String, value: 'this is a string', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 17}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('"string"alphanumeric"');
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.String, value: 'string', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 7}});
	expect(tokenizer.next().value).toEqual({type: Type.Alphanumeric, value: 'alphanumeric', position: {line: 0, character: 8}});
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 20}});
	expect(tokenizer.next().value).toEqual({type: Type.String, value: '', position: {line: 0, character: 21}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('""');
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.String, value: '', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toBeUndefined();

	tokenizer = getTokens('"eggs\nflour\nmilk"');
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 0, character: 0}});
	expect(tokenizer.next().value).toEqual({type: Type.String, value: 'eggs\nflour\nmilk', position: {line: 0, character: 1}});
	expect(tokenizer.next().value).toEqual({type: Type.DoubleQuotes, value: '"', position: {line: 2, character: 4}});
	expect(tokenizer.next().value).toBeUndefined();
})

test('carriage return line feed', () => {
	let tokenizer = getTokens('\r\n')
	let tokens = [];
	for (let token of tokenizer) {
		tokens.push(token);
	}
	expect(tokens).toHaveLength(2);
	expect(tokens[0].value).toBe('\r')
})

test('comment newline', () => {
	let tokenizer = getTokens('// this is a comment\n')
	let tokens = [];
	for (let token of tokenizer) {
		tokens.push(token);
	}
	expect(tokens[0].type).toBe(Type.LineCommentInit)
	expect(tokens[1].type).toBe(Type.LineComment)
	expect(tokens[1].value).toBe(' this is a comment')
	expect(tokens[2].type).toBe(Type.NewLine)
})

test('comment with semicolon', () => {
	let tokenizer = getTokens('; this is a comment\n')
	let tokens = [];
	for (let token of tokenizer) {
		tokens.push(token);
	}
	expect(tokens[0].type).toBe(Type.LineCommentInit)
	expect(tokens[1].type).toBe(Type.LineComment)
	expect(tokens[1].value).toBe(' this is a comment')
	expect(tokens[2].type).toBe(Type.NewLine)
})
