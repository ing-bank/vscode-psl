import {lv2vFormat, lvFormat, v2lvFormat} from '../src/mtm/utils';

const BASE: number = 256;

describe('pack values', () => {

	test('pack value < 255', () => {
		const inputString: string = 'Some small string';
		expect(lvFormat(inputString)).toBe(String.fromCharCode(18) + inputString);
	});

	test('pack value < 65534', () => {
		const inputString: string = 'Alright' + ' alright'.repeat(100);
		expect(lvFormat(inputString)).toBe(String.fromCharCode(0, 2, 3, 41) + inputString);
	});

	test('pack value < 16777213', () => {
		const digit1: number = 255;
		const digit2: number = 255;
		const digit3: number = 253;
		const inputString: string = 'x'.repeat(digit1 * (BASE ** 2) + digit2 * BASE + digit3 - 3);
		expect(lvFormat(inputString)).toBe(String.fromCharCode(0, 3, 255, 255, 253) + inputString);
	});

	test('pack value > 16777213', () => {
		const digit1: number = 1;
		const digit2: number = 3;
		const digit3: number = 3;
		const digit4: number = 7;
		const inputString: string = 'y'.repeat(digit1 * (BASE ** 3) + digit2 * (BASE ** 2) + digit3 * BASE + digit4 - 4);
		expect(lvFormat(inputString)).toBe(String.fromCharCode(0, 4, digit1, digit2, digit3, digit4) + inputString);
	});
});

describe('unpack values', () => {
	test('unpack value < 255', () => {
		const outputString: string = 'Some small string';
		const inputBuffer: Buffer = new Buffer(String.fromCharCode(18) + outputString);
		expect(lv2vFormat(inputBuffer)[0].toString()).toBe(outputString);
	});

	test('unpack value < 65534', () => {
		const outputString: string = 'Alright' + ' alright'.repeat(100);
		const inputBuffer: Buffer = new Buffer(String.fromCharCode(0, 2, 3, 41) + outputString);
		expect(lv2vFormat(inputBuffer)[0].toString()).toBe(outputString);
	});

	test('unpack value < 16777213', () => {
		const digit1: number = 255;
		const digit2: number = 255;
		const digit3: number = 253;
		const outputString: string = 'x'.repeat(digit1 * (BASE ** 2) + digit2 * BASE + digit3 - 3);

		const inputBuffer = Buffer.concat(
			[
				Buffer.from([0, 3, digit1, digit2, digit3]),
				Buffer.from(outputString),
			],
			outputString.length + 5);

		expect(lv2vFormat(inputBuffer)[0].toString()).toBe(outputString);
	});

	test('unpack value > 16777213', () => {
		const digit1: number = 1;
		const digit2: number = 3;
		const digit3: number = 3;
		const digit4: number = 7;
		const outputString: string = 'y'.repeat(digit1 * (BASE ** 3) + digit2 * (BASE ** 2) + digit3 * BASE + digit4 - 4);

		const inputBuffer: Buffer = Buffer.concat(
			[
				Buffer.from([0, 4, digit1, digit2, digit3, digit4]),
				Buffer.from(outputString),
			],
			outputString.length + 6,
		);

		expect(lv2vFormat(inputBuffer)[0].toString()).toBe(outputString);
	});
});

describe('pack arrays', () => {
	test('pack empty array', () => {
		expect(v2lvFormat([])).toBe('');
	});

	test('one element array', () => {
		expect(v2lvFormat(['hi'])).toBe(String.fromCharCode(3) + 'hi');
	});

	test('multiple elements array', () => {
		expect(v2lvFormat(['We', 'are', 'elements', 'in', 'an', 'array'])).toBe(
			String.fromCharCode(3) + 'We' +
			String.fromCharCode(4) + 'are' +
			String.fromCharCode(9) + 'elements' +
			String.fromCharCode(3) + 'in' +
			String.fromCharCode(3) + 'an' +
			String.fromCharCode(6) + 'array',
		);
	});

	test('array with big elements', () => {
		const lyrics: string = 'Alright' + ' alright'.repeat(100);
		expect(v2lvFormat(['Lyrics of Hey Ya', lyrics])).toBe(
			String.fromCharCode(17) + 'Lyrics of Hey Ya' +
			String.fromCharCode(0, 2, 3, 41) + lyrics,
		);
	});
});

describe('unpack arrays', () => {
	test('unpack empty strings', () => {
		expect(lv2vFormat(Buffer.from([1, 1]))).toEqual([Buffer.from(''), Buffer.from('')]);
	});

	test('unpack small elements', () => {
		expect(lv2vFormat(Buffer.from(String.fromCharCode(3) + 'hi' + String.fromCharCode(6) + 'there')))
			.toEqual([Buffer.from('hi'), Buffer.from('there')]);
	});

	test('unpack mixed lengths', () => {
		const lyrics: string = 'Alright' + ' alright'.repeat(100);
		expect(lv2vFormat(Buffer.from(
			String.fromCharCode(17) + 'Lyrics of Hey Ya' +
			String.fromCharCode(0, 2, 3, 41) + lyrics +
			String.fromCharCode(11) + 'By Outkast',
		))).toEqual(
			[
				Buffer.from('Lyrics of Hey Ya'),
				Buffer.from(lyrics),
				Buffer.from('By Outkast'),
			]);
	});
});
