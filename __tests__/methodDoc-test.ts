import * as api from '../src/pslLint/api';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from '../src/pslLint/methodDoc';
import * as utils from './ruleUtils';

function messageOnLine(lineNumber: number, allDiagnostics: api.Diagnostic[]): string {
	const diagnosticsOnLine = utils.diagnosticsOnLine(lineNumber, allDiagnostics);
	if (!diagnosticsOnLine.length) return '';
	return diagnosticsOnLine[0].message;
}

describe('Parameter tests', () => {
	const procName = 'ZMethodDoc.PROC';
	let docDiagnostics: api.Diagnostic[] = [];
	let emptyLineDiagnostics: api.Diagnostic[] = [];
	let separatorDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		docDiagnostics = await utils.getDiagnostics(procName, MethodDocumentation.name);
		emptyLineDiagnostics = await utils.getDiagnostics(procName, TwoEmptyLines.name);
		separatorDiagnostics = await utils.getDiagnostics(procName, MethodSeparator.name);
	});

	test('allProblemsNoLineAbove', () => {
		// expect(messageOnLine(0, docDiagnostics)).toBe('TODO');
		// expect(messageOnLine(0, separatorDiagnostics)).toBe('TODO');
		// expect(messageOnLine(0, emptyLineDiagnostics)).toBe('TODO');
	});
	test('allProblems', () => {
		// expect(messageOnLine(2, docDiagnostics)).toBe('TODO');
		// expect(messageOnLine(2, separatorDiagnostics)).toBe('TODO');
		// expect(messageOnLine(2, emptyLineDiagnostics)).toBe('TODO');
	});
	test('onlySeparator', () => {
		// expect(messageOnLine(5, docDiagnostics)).toBe('TODO');
		expect(messageOnLine(5, separatorDiagnostics)).toBe('');
		// expect(messageOnLine(5, emptyLineDiagnostics)).toBe('TODO');
	});
	test('twoLineSeparator', () => {
		// expect(messageOnLine(14, docDiagnostics)).toBe('TODO');
		expect(messageOnLine(14, separatorDiagnostics)).toBe('');
		expect(messageOnLine(14, emptyLineDiagnostics)).toBe('');
	});
	test('onlyDoc', () => {
		expect(messageOnLine(16, docDiagnostics)).toBe('');
		// expect(messageOnLine(16, separatorDiagnostics)).toBe('TODO');
		// expect(messageOnLine(16, emptyLineDiagnostics)).toBe('TODO');
	});
	test('oneLineDoc', () => {
		expect(messageOnLine(20, docDiagnostics)).toBe('');
		// expect(messageOnLine(20, separatorDiagnostics)).toBe('TODO');
		// expect(messageOnLine(20, emptyLineDiagnostics)).toBe('TODO');
	});
	test('twoLineDoc', () => {
		expect(messageOnLine(25, docDiagnostics)).toBe('');
		// expect(messageOnLine(25, separatorDiagnostics)).toBe('TODO');
		// expect(messageOnLine(25, emptyLineDiagnostics)).toBe('');
	});
	test('withEverything', () => {
		expect(messageOnLine(31, docDiagnostics)).toBe('');
		expect(messageOnLine(31, separatorDiagnostics)).toBe('');
		expect(messageOnLine(31, emptyLineDiagnostics)).toBe('');
	});
});
