import { match, Config, transform } from "../src/pslLint/config";

const config: Config = {
	'include': {
		'Z*': ['*'],
		'*.psl': ['*'],
		'*': ['TodoInfo']
	},
	'exclude': {
		'ZRPC.PROC': ['*']
	}
}

test('does not match ZRPC.PROC', () => {
	expect(match('ZRPC.PROC', 'arule', transform(config))).toEqual(false);
})

test('does match x.psl', () => {
	expect(match('x.psl', 'arule', transform(config))).toEqual(true);
})

test('does match ZRPC1.PROC', () => {
	expect(match('ZRPC1.PROC', 'arule', transform(config))).toEqual(true);
})

test('TodoInfo match A.PROC', () => {
	expect(match('A.PROC', 'TodoInfo', transform(config))).toEqual(true);
})

test('arule match A.PROC', () => {
	expect(match('A.PROC', 'arule', transform(config))).toEqual(false);
})
