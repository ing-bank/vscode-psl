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
		expect(messageOnLine(0, docDiagnostics)).toBe(`Documentation missing for label "allProblemsNoLineAbove".`);
		expect(messageOnLine(0, separatorDiagnostics)).toBe(`Separator missing for label "allProblemsNoLineAbove".`);
		expect(messageOnLine(0, emptyLineDiagnostics)).toBe(
			`There should be two empty lines above label "allProblemsNoLineAbove".`
			);
	});
	test('allProblems', () => {
		expect(messageOnLine(2, docDiagnostics)).toBe(`Documentation missing for label "allProblems".`);
		expect(messageOnLine(2, separatorDiagnostics)).toBe(`Separator missing for label "allProblems".`);
		expect(messageOnLine(2, emptyLineDiagnostics)).toBe(`There should be two empty lines above label "allProblems".`);
	});
	test('onlySeparator', () => {
		expect(messageOnLine(5, docDiagnostics)).toBe(`Documentation missing for label "onlySeparator".`);
		expect(messageOnLine(5, separatorDiagnostics)).toBe('');
		expect(messageOnLine(5, emptyLineDiagnostics)).toBe(`There should be two empty lines above label "onlySeparator".`);
	});
	test('twoLineSeparator', () => {
		expect(messageOnLine(14, docDiagnostics)).toBe(`Documentation missing for label "twoLineSeparator".`);
		expect(messageOnLine(14, separatorDiagnostics)).toBe('');
		expect(messageOnLine(14, emptyLineDiagnostics)).toBe('');
	});
	test('onlyDoc', () => {
		expect(messageOnLine(16, docDiagnostics)).toBe('');
		expect(messageOnLine(16, separatorDiagnostics)).toBe(`Separator missing for label "onlyDoc".`);
		expect(messageOnLine(16, emptyLineDiagnostics)).toBe(`There should be two empty lines above label "onlyDoc".`);
	});
	test('oneLineDoc', () => {
		expect(messageOnLine(20, docDiagnostics)).toBe('');
		expect(messageOnLine(20, separatorDiagnostics)).toBe(`Separator missing for label "oneLineDoc".`);
		expect(messageOnLine(20, emptyLineDiagnostics)).toBe(`There should be two empty lines above label "oneLineDoc".`);
	});
	test('twoLineDoc', () => {
		expect(messageOnLine(25, docDiagnostics)).toBe('');
		expect(messageOnLine(25, separatorDiagnostics)).toBe(`Separator missing for label "twoLineDoc".`);
		expect(messageOnLine(25, emptyLineDiagnostics)).toBe('');
	});
	test('withEverything', () => {
		expect(messageOnLine(31, docDiagnostics)).toBe('');
		expect(messageOnLine(31, separatorDiagnostics)).toBe('');
		expect(messageOnLine(31, emptyLineDiagnostics)).toBe('');
	});
});
