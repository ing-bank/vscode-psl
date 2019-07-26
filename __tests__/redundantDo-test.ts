import * as api from '../src/pslLint/api';
import * as utils from './ruleUtils';
import { RedundantDoStatement } from '../src/pslLint/cli/lib/pslLint/doBlock';

describe('Members tests', () => {
	let redundantDiagnostics: api.Diagnostic[] = [];
	

	beforeAll(async () => {
		redundantDiagnostics = await utils.getDiagnostics('ZTestRedundantDO.PROC', RedundantDoStatement.name);
	}); 

	test('block as first statement', () => {
		const diagnosticsOnLine = utils.diagnosticsOnLine(3, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(0);
	});
	
	test('if block with no quit', () => {
		const diagnosticsOnLine = utils.diagnosticsOnLine(11, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "if"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('if block with quit', () => {
		const diagnosticsOnLine = utils.diagnosticsOnLine(16, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "if"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('else if block', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(19, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "if"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('else block ', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(22, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "else"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('while block', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(26, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "while"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('while block with post quit', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(30, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "while"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('conventional for', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(36, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "for"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('for order', () => {	
		const diagnosticsOnLine = utils.diagnosticsOnLine(41, redundantDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`"do" statement on same line as "quit"`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});

});
