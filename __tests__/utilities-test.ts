import * as path from 'path';
import { MemberClass, ParsedDocument, parseFile } from '../src/parser/parser';
import * as tokenizer from '../src/parser/tokenizer';
import * as utilities from '../src/parser/utilities';

function getTokens(str: string): tokenizer.Token[] {
	return [...tokenizer.getTokens(str)];
}

describe('completion', () => {
	test('empty', () => {
		const tokensOnLine: tokenizer.Token[] = [];
		const index = 0;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result.length).toBe(0);
	});
	test('undefined', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a()');
		const index = 1;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result.length).toBe(0);
	});
	test('undefined 2', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a()');
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result.length).toBe(0);
	});
	test('undefined 3', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a ');
		const index = 1;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result.length).toBe(0);
	});
	test('basic dot', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a.b');
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
	});
	test('two dots', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a.b.c');
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
		expect(result[2].value).toBe('c');
	});
	test('single reference', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('do a()');
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
	});
	test('dot with parens', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a().b');
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
	});
	test('dot with parens content', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
		const index = 5;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
	});
	test('dot with parens content with parens', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a(blah(bleh())).b');
		const index = 10;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
	});
	test('dot with parens content on dot', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('.');
	});
	test('clusterfuck', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a.b().c(x(y)).d');
		const index = 14;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
		expect(result[2].value).toBe('c');
		expect(result[3].value).toBe('d');
	});
	test('clusterfuck2', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('a.b().c(x(y)).d');
		const index = 14;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('a');
		expect(result[1].value).toBe('b');
		expect(result[2].value).toBe('c');
		expect(result[3].value).toBe('d');
	});
	test('mumps call label', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('method^CLASS()');
		const index = 0;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[1].value).toBe('method');
		expect(result[0].value).toBe('CLASS');
	});

	test('mumps call routine', () => {
		const tokensOnLine: tokenizer.Token[] = getTokens('method^CLASS()');
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		expect(result[0].value).toBe('CLASS');
	});
});

describe('ParsedDocFinder', () => {
	let filesDir: string;

	let parentFilePath: string;
	let childFilePath: string;

	let parsedParent: ParsedDocument;
	let parsedChild: ParsedDocument;

	beforeAll(async () => {
		filesDir = path.resolve('__tests__', 'files');

		parentFilePath = path.join(filesDir, 'ZParent.PROC');
		childFilePath = path.join(filesDir, 'ZChild.PROC');

		parsedParent = await parseFile(parentFilePath);
		parsedChild = await parseFile(childFilePath);
	});

	test('Find dummy in child', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'dummy', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.property);
		expect(result.member.id.value).toBe('dummy');
		expect(result.fsPath).toBe(childFilePath);
	});

	test('Find property in child', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'propInChild', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.property);
		expect(result.member.id.value).toBe('propInChild');
		expect(result.fsPath).toBe(childFilePath);
	});

	test('Find method in child', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'methodInChild', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.method);
		expect(result.member.id.value).toBe('methodInChild');
		expect(result.fsPath).toBe(childFilePath);
	});

	test('Find method overriden method in child', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'methodInParentAndChild', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.method);
		expect(result.member.id.value).toBe('methodInParentAndChild');
		expect(result.fsPath).toBe(childFilePath);
	});

	test('Find method inherited method in parent', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'methodInParent', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.method);
		expect(result.member.id.value).toBe('methodInParent');
		expect(result.fsPath).toBe(parentFilePath);
	});

	test('Find method in parent', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: parentFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedParent, paths);
		const result = await searchParser(finder, 'methodInParent', { character: 0, line: 0 });
		expect(result.member.memberClass).toBe(MemberClass.method);
		expect(result.member.id.value).toBe('methodInParent');
		expect(result.fsPath).toBe(parentFilePath);
	});

	test('Find y in methodInChild', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'y', { character: 0, line: 12 });
		expect(result.member.memberClass).toBe(MemberClass.declaration);
		expect(result.member.id.value).toBe('y');
		expect(result.fsPath).toBe(childFilePath);
	});

	test('Do not find x', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'x', { character: 0, line: 12 });
		expect(result).toBeUndefined();
	});

	test('Do not find reallySpecificName', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: childFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
		const result = await searchParser(finder, 'reallySpecificName', { character: 0, line: 10 });
		expect(result).toBeUndefined();
	});

	test('Do find reallySpecificName', async () => {
		const paths: utilities.FinderPaths = {
			corePsl: '',
			projectPsl: [filesDir],
			routine: parentFilePath,
			table: '',
		};
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedParent, paths);
		const result = await searchParser(finder, 'reallySpecificName', { character: 0, line: 10 });
		expect(result.member.memberClass).toBe(MemberClass.declaration);
		expect(result.member.id.value).toBe('reallySpecificName');
		expect(result.fsPath).toBe(parentFilePath);
	});
});

function searchParser(finder: utilities.ParsedDocFinder, value: string, position: tokenizer.Position) {
	return finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, value, position));
}
