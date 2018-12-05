import { Config, matchConfig, transform } from '../src/pslLint/config';

const config: Config = {
	exclude: {
		'ZRPC.PROC': ['*'],
	},
	include: {
		'*': ['TodoInfo'],
		'*.psl': ['*'],
		'Z*': ['*'],
	},
};

test('does not match ZRPC.PROC', () => {
	expect(matchConfig('ZRPC.PROC', 'arule', transform(config))).toEqual(false);
});

test('does match x.psl', () => {
	expect(matchConfig('x.psl', 'arule', transform(config))).toEqual(true);
});

test('does match ZRPC1.PROC', () => {
	expect(matchConfig('ZRPC1.PROC', 'arule', transform(config))).toEqual(true);
});

test('TodoInfo match A.PROC', () => {
	expect(matchConfig('A.PROC', 'TodoInfo', transform(config))).toEqual(true);
});

test('arule match A.PROC', () => {
	expect(matchConfig('A.PROC', 'arule', transform(config))).toEqual(false);
});
