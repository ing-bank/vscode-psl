import * as utilities from '../src/parser/utillities';
import * as tokenizer from '../src/parser/tokenizer';

function getTokens(str: string): tokenizer.Token[] {
    let ret: tokenizer.Token[] = [];
    for (const token of tokenizer.getTokens(str)) {
        ret.push(token);
    }
    return ret;
}

describe('completion', () => {
    test('empty', () => {
        let tokensOnLine = [];
        let index = 0;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token).toBeUndefined();
    })
    test('undefined', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a()');
        let index = 1;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result).toBeUndefined();
    })
    test('undefined 2', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a()');
        let index = 2;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result).toBeUndefined();
    })
    test('undefined 3', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a ');
        let index = 1;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result).toBeUndefined();
    })
    test('basic dot', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b');
        let index = 2;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('b');
        expect(result.parent.token.value).toBe('a');
    })
    test('two dots', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b.c');
        let index = 4;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('c');
        expect(result.parent.token.value).toBe('b');
        expect(result.parent.parent.token.value).toBe('a');
    })
    test('single reference', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('do a()');
        let index = 2;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('a');
    })
    test('dot with parens', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a().b');
        let index = 4;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('b');
        expect(result.parent.token.value).toBe('a');
    })
    test('dot with parens content', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
        let index = 5;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('b');
        expect(result.parent.token.value).toBe('a');
    })
    test('dot with parens content with parens', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah(bleh())).b');
        let index = 10;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('b');
        expect(result.parent.token.value).toBe('a');
    })
    test('dot with parens content on dot', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a(blah).b');
        let index = 4;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('.');
        expect(result.parent.token.value).toBe('a');
    })
    test('clusterfuck', () => {
        let tokensOnLine: tokenizer.Token[] = getTokens('a.b().c(x(y)).d');
        let index = 14;
        let result = utilities.parseStatement(tokensOnLine, index);
        expect(result.token.value).toBe('d');
        expect(result.parent.token.value).toBe('c');
        expect(result.parent.parent.token.value).toBe('b');
        expect(result.parent.parent.parent.token.value).toBe('a');
    })
})