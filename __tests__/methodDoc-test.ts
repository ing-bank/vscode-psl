import * as api from '../src/pslLint/api';
import * as utils from './ruleUtils';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from '../src/pslLint/methodDoc';

describe('Parameter tests', () => {

	let docDiagnostics: api.Diagnostic[] = [];
	let separatorDiagnostics: api.Diagnostic[] = [];
	let emptyLineDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		docDiagnostics = await utils.getDiagnostics('ZMethodDoc.PROC', MethodDocumentation.name);
		separatorDiagnostics = await utils.getDiagnostics('ZMethodDoc.PROC', MethodSeparator.name);
		emptyLineDiagnostics = await utils.getDiagnostics('ZMethodDoc.PROC', TwoEmptyLines.name);
	})

	test('allProblemsNoLineAbove', () => {
		expect(utils.diagnosticsOnLine(0, docDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(0, separatorDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(0, emptyLineDiagnostics).length).toBe(1);
	})
	test('allProblems', () => {
		expect(utils.diagnosticsOnLine(2, docDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(2, separatorDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(2, emptyLineDiagnostics).length).toBe(1);
	})
	test('onlySeparator', () => {
		expect(utils.diagnosticsOnLine(5, docDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(5, separatorDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(5, emptyLineDiagnostics).length).toBe(1);
	})
	test('twoLineSeparator', () => {
		expect(utils.diagnosticsOnLine(14, docDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(14, separatorDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(14, emptyLineDiagnostics).length).toBe(0);
	})
	test('onlyDoc', () => {
		expect(utils.diagnosticsOnLine(16, docDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(16, separatorDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(16, emptyLineDiagnostics).length).toBe(1);
	})
	test('oneLineDoc', () => {
		expect(utils.diagnosticsOnLine(20, docDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(20, separatorDiagnostics).length).toBe(1);
		expect(utils.diagnosticsOnLine(20, emptyLineDiagnostics).length).toBe(1);
	})
	// test('twoLineDoc', () => {
	// 	expect(utils.diagnosticsOnLine(25, docDiagnostics).length).toBe(0);
	// 	expect(utils.diagnosticsOnLine(25, separatorDiagnostics).length).toBe(1);
	// 	expect(utils.diagnosticsOnLine(25, emptyLineDiagnostics).length).toBe(0);
	// })
	test('withEverything', () => {
		expect(utils.diagnosticsOnLine(31, docDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(31, separatorDiagnostics).length).toBe(0);
		expect(utils.diagnosticsOnLine(31, emptyLineDiagnostics).length).toBe(0);
	})
})
