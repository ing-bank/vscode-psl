import { ParametersOnNewLine } from '../src/pslLint/parameters';
import { Diagnostic } from '../src/pslLint/api';
import { parseText } from '../src/parser/parser';
import * as fs from 'fs-extra';
import * as path from 'path';

const testFilePath = path.resolve('__tests__', 'files', 'ZTestParams.PROC');
let parametersReport: Diagnostic[];

/**
 * 
 * @param reports The reports to filter
 * @param lineNumber Zero-based line number to check, i.e. line 1 of the document is lineNumber 0.
 */
function reportsOnLine(lineNumber: number, reports?: Diagnostic[]) {
	if (!reports) {
		return parametersReport.filter(r => r.range.start.line === lineNumber).length;
	}
	return reports.filter(r => r.range.start.line === lineNumber).length;
}

describe('Parameter tests', () => {
	beforeAll(async () => {
		let text = await fs.readFile(testFilePath).then(b => b.toString());
		let document = parseText(text);
		parametersReport = new ParametersOnNewLine().report(document)
	})

	test('No report for no params', () => {
		expect(reportsOnLine(2)).toBe(0)
	})

	test('No report for one param on same line', () => {
		expect(reportsOnLine(7)).toBe(0)
	})

	test('Two reports for two params', () => {
		expect(reportsOnLine(12)).toBe(2)
	})

	test('Catch label', () => {
		expect(reportsOnLine(17)).toBe(3)
	})

	test('Catch no types on params', () => {
		expect(reportsOnLine(22)).toBe(4)
	})

	test('Catch tree', () => {
		expect(reportsOnLine(27)).toBe(2)
	})

	test('Catch tree with empty parens', () => {
		expect(reportsOnLine(32)).toBe(2)
	})

	test('Catch tree with empty parens and commas', () => {
		expect(reportsOnLine(37)).toBe(2)
	})
})