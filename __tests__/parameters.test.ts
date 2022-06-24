import { MethodParametersOnNewLine } from '../src/pslLint/parameters';
import * as api from '../src/pslLint/api';
import * as utils from './ruleUtils';

describe('Parameter tests', () => {

	let parametersReport: api.Diagnostic[] = [];

	beforeAll(async () => {
		parametersReport = await utils.getDiagnostics('ZTestParams.PROC', MethodParametersOnNewLine.name);
	})

	test('No report for no params', () => {
		expect(utils.diagnosticsOnLine(2, parametersReport).length).toBe(0)
	})

	test('No report for one param on same line', () => {
		expect(utils.diagnosticsOnLine(7, parametersReport).length).toBe(0)
	})

	test('Two reports for two params', () => {
		expect(utils.diagnosticsOnLine(12, parametersReport).length).toBe(2)
	})

	test('Catch label', () => {
		expect(utils.diagnosticsOnLine(17, parametersReport).length).toBe(3)
	})

	test('Catch no types on params', () => {
		expect(utils.diagnosticsOnLine(22, parametersReport).length).toBe(4)
	})

	test('Catch tree', () => {
		expect(utils.diagnosticsOnLine(27, parametersReport).length).toBe(2)
	})

	test('Catch tree with empty parens', () => {
		expect(utils.diagnosticsOnLine(32, parametersReport).length).toBe(2)
	})

	test('Catch tree with empty parens and commas', () => {
		expect(utils.diagnosticsOnLine(37, parametersReport).length).toBe(2)
	})
})
