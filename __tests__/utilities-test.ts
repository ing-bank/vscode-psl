import * as path from 'path';
import * as tokenizer from '../src/parser/tokenizer';
import * as utilities from '../src/parser/utillities';
import { ParsedDocument, parseFile, MemberClass } from '../src/parser/parser';

function getTokens(str: string): tokenizer.Token[] {
    return Array.from(tokenizer.getTokens(str));
}

describe('completion', () => {
    test('empty', () => {
        let tokensOnLine: tokenizer.Token[] = [];
        let index = 0;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result.length).toBe(0);
    })
    test('undefined', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a()');
        let index = 1;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result.length).toBe(0);
    })
    test('undefined 2', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a()');
        let index = 2;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result.length).toBe(0);
    })
    test('undefined 3', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a ');
        let index = 1;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result.length).toBe(0);
    })
    test('basic dot', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b');
        let index = 2;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
    })
    test('two dots', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b.c');
        let index = 4;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
        expect(result[2].value).toBe('c');
    })
    test('single reference', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('do a()');
        let index = 2;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
    })
    test('dot with parens', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a().b');
        let index = 4;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
    })
    test('dot with parens content', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
        let index = 5;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
    })
    test('dot with parens content with parens', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah(bleh())).b');
        let index = 10;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
    })
    test('dot with parens content on dot', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
        let index = 4;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('.');
    })
    test('clusterfuck', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b().c(x(y)).d');
        let index = 14;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
        expect(result[2].value).toBe('c');
        expect(result[3].value).toBe('d');
    })
    test('clusterfuck2', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b().c(x(y)).d');
        let index = 14;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('a');
        expect(result[1].value).toBe('b');
        expect(result[2].value).toBe('c');
        expect(result[3].value).toBe('d');
    })
    test('mumps call label', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('method^CLASS()');
        let index = 0;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[1].value).toBe('method');
        expect(result[0].value).toBe('CLASS');
    })
    
    test('mumps call routine', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('method^CLASS()');
        let index = 2;
        let result = utilities.getCallTokens(tokensOnLine, index);
        expect(result[0].value).toBe('CLASS');
    })
})

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
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'dummy', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.property);
        expect(result.member.id.value).toBe('dummy');
        expect(result.fsPath).toBe(childFilePath);
    });

    test('Find property in child', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'propInChild', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.property);
        expect(result.member.id.value).toBe('propInChild');
        expect(result.fsPath).toBe(childFilePath);
    });

    test('Find method in child', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'methodInChild', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.method);
        expect(result.member.id.value).toBe('methodInChild');
        expect(result.fsPath).toBe(childFilePath);
    })

    test('Find method overriden method in child', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'methodInParentAndChild', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.method);
        expect(result.member.id.value).toBe('methodInParentAndChild');
        expect(result.fsPath).toBe(childFilePath);
    });

    test('Find method inherited method in parent', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'methodInParent', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.method);
        expect(result.member.id.value).toBe('methodInParent');
        expect(result.fsPath).toBe(parentFilePath);
    });

    test('Find method in parent', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: parentFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedParent, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'methodInParent', { character: 0, line: 0 }));
        expect(result.member.memberClass).toBe(MemberClass.method);
        expect(result.member.id.value).toBe('methodInParent');
        expect(result.fsPath).toBe(parentFilePath);
    });

    test('Find y in methodInChild', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'y', { character: 0, line: 12 }));
        expect(result.member.memberClass).toBe(MemberClass.declaration);
        expect(result.member.id.value).toBe('y');
        expect(result.fsPath).toBe(childFilePath);
    });

    test('Do not find x', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'x', { character: 0, line: 12 }));
        expect(result).toBeUndefined();
    });

    test('Do not find reallySpecificName', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: childFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedChild, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'reallySpecificName', { character: 0, line: 10 }));
        expect(result).toBeUndefined();
    });

    test('Do find reallySpecificName', async () => {
        let paths: utilities.FinderPaths = {
            corePsl: '',
            projectPsl: [filesDir],
            routine: parentFilePath,
            table: ''
        }
        let finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(parsedParent, paths);
        let result = await finder.searchParser(new tokenizer.Token(tokenizer.Type.Alphanumeric, 'reallySpecificName', { character: 0, line: 10 }));
        expect(result.member.memberClass).toBe(MemberClass.declaration);
        expect(result.member.id.value).toBe('reallySpecificName');
        expect(result.fsPath).toBe(parentFilePath);
    });
})
