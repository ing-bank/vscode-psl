import * as api from '../src/pslLint/api';
import { parseText } from '../src/parser/parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as activate from '../src/pslLint/activate';
import { RuntimeStart } from '../src/pslLint/runtime';

const testFilePath = path.resolve('__tests__', 'files', 'ZRuntime.PROC');
let runtimeDiagnostics: api.Diagnostic[];

/**
 * 
 * @param reports The reports to filter
 * @param lineNumber Zero-based line number to check, i.e. line 1 of the document is lineNumber 0.
 */
function reportsOnLine(lineNumber: number, reports?: api.Diagnostic[]) {
	if (!reports) {
		return runtimeDiagnostics.filter(r => r.range.start.line === lineNumber);
	}
	return reports.filter(r => r.range.start.line === lineNumber);
}

describe('Parameter tests', () => {
	beforeAll(async () => {
		let text = await fs.readFile(testFilePath).then(b => b.toString());

		let pslDocument = new api.PslDocument(parseText(text), text, testFilePath);
		let ruleSubscriptions = new activate.RuleSubscription(pslDocument);
		ruleSubscriptions.addMethodRules(new RuntimeStart());
		activate.reportRules(ruleSubscriptions);
		runtimeDiagnostics = ruleSubscriptions.diagnostics;
	})

	test('Diagnostic count', () => {
		expect(runtimeDiagnostics.length).toBe(2);
	})

	test('No diagnostic first start', () => {
		expect(reportsOnLine(9)).toMatchObject([]);
	})
	
	test('One diagnostic second start', () => {
		let reports = reportsOnLine(13);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Declaration "a" referenced inside Runtime.start but not in variable list.`);
	})
	
	test('One diagnostic third start', () => {
		let reports = reportsOnLine(18);
		expect(reports.length).toBe(1);
		expect(reports[0].message).toBe(`Declaration "a" referenced inside Runtime.start but not in variable list.`);
	})
	
	test('No diagnostic fourth start', () => {
		expect(reportsOnLine(24)).toMatchObject([]);
	})

})
