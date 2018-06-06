import * as api from '../src/pslLint/api';
import { parseText } from '../src/parser/parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as activate from '../src/pslLint/activate';
import { MethodConventionChecker, MemberConventionChecker, PropertyLiteralCase } from '../src/pslLint/elementsConventionChecker';

const testFilePath = path.resolve('__tests__', 'files', 'ZTestConvention.PROC');
let membersReport: api.Diagnostic[];

/**
 * 
 * @param reports The reports to filter
 * @param lineNumber Zero-based line number to check, i.e. line 1 of the document is lineNumber 0.
 */
function reportsOnLine(lineNumber: number, reports?: api.Diagnostic[]) {
	if (!reports) {
		return membersReport.filter(r => r.range.start.line === lineNumber);
	}
	return reports.filter(r => r.range.start.line === lineNumber);
}

describe('Members tests', () => {
	beforeAll(async () => {
		let text = await fs.readFile(testFilePath).then(b => b.toString());

		let pslDocument = new api.PslDocument(parseText(text), text, testFilePath);
		let ruleSubscriptions = new activate.RuleSubscription(pslDocument);
		ruleSubscriptions.addMethodRules(new MethodConventionChecker());
		ruleSubscriptions.addMemberRules(new MemberConventionChecker());
		ruleSubscriptions.addPropertyRules(new PropertyLiteralCase());
		
		activate.reportRules(ruleSubscriptions);
		membersReport = ruleSubscriptions.diagnostics;
		
	})

	test('Upper case literal report', () => {
		expect(reportsOnLine(4).length).toBe(1)
	})
	
	test('Camel case literal report', () => {
		expect(reportsOnLine(5).length).toBe(1)
	})

	 test('Starting with z label', () => {
        expect(reportsOnLine(10).length).toBe(1);
	})

	test('More than 25 characters', () => {
        expect(reportsOnLine(14).length).toBe(1);
    })
})