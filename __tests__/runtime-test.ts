import * as api from '../src/pslLint/api';
import { RuntimeStart } from '../src/pslLint/runtime';
import * as utils from './ruleUtils';

describe('Parameter tests', () => {

	let runtimeDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		runtimeDiagnostics = await utils.getDiagnostics('ZRuntime.PROC', RuntimeStart.name);
	});

	test('Diagnostic count', () => {
		expect(runtimeDiagnostics.length).toBe(5);
	});

	test('No diagnostic first start', () => {
		expect(utils.diagnosticsOnLine(9, runtimeDiagnostics)).toMatchObject([]);
	});

	test('One diagnostic second start', () => {
		const reports = utils.diagnosticsOnLine(13, runtimeDiagnostics);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Declaration "flagged" referenced inside Runtime.start but not in variable list.`);
	});

	test('One diagnostic third start', () => {
		const reports = utils.diagnosticsOnLine(18, runtimeDiagnostics);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Declaration "flagged" referenced inside Runtime.start but not in variable list.`);
	});

	test('No diagnostic with comment', () => {
		expect(utils.diagnosticsOnLine(24, runtimeDiagnostics)).toMatchObject([]);
	});

	test('No diagnostic fifth start', () => {
		expect(utils.diagnosticsOnLine(29, runtimeDiagnostics)).toMatchObject([]);
	});

	test('Method in middle with new variable', () => {
		const reports = utils.diagnosticsOnLine(35, runtimeDiagnostics);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Parameter "flaggedParam" referenced inside Runtime.start but not in variable list.`);
	});

	test('Method in middle with new variable', () => {
		const reports = utils.diagnosticsOnLine(42, runtimeDiagnostics);
		const diagnostic = reports[0] as api.Diagnostic;
		const relatedArray = diagnostic.relatedInformation as api.DiagnosticRelatedInformation[];
		const source = relatedArray[0] as api.DiagnosticRelatedInformation;
		const reference = relatedArray[1] as api.DiagnosticRelatedInformation;
		expect(reports.length).toBe(1);
		expect(diagnostic.message).toBe(
			`Declaration "notFlaggedTwice" referenced inside Runtime.start but not in variable list.`,
		);
		expect(relatedArray.length).toBe(2);
		expect(source.message).toBe(`Source of "notFlaggedTwice"`);
		expect(reference.message).toBe(`Reference to "notFlaggedTwice"`);
	});

	test('No literal', () => {
		const reports = utils.diagnosticsOnLine(49, runtimeDiagnostics);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Declaration "flagged" referenced inside Runtime.start but not in variable list.`);
	});
});
