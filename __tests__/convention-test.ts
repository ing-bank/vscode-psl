import * as api from '../src/pslLint/api';
import {
	MemberCamelCase, MemberLength,
	MemberLiteralCase, MemberStartsWithV, PropertyIsDummy } from '../src/pslLint/elementsConventionChecker';
import * as utils from './ruleUtils';

describe('Members tests', () => {
	let literalDiagnostics: api.Diagnostic[] = [];
	let camelCaseDiagnostics: api.Diagnostic[] = [];
	let lengthDiagnostics: api.Diagnostic[] = [];
	let vDiagnostics: api.Diagnostic[] = [];
	let withoutDummyDiagnostics: api.Diagnostic[] = [];
	let withDummyDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		literalDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberLiteralCase.name);
		camelCaseDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberCamelCase.name);
		lengthDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberLength.name);
		vDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberStartsWithV.name);
		withoutDummyDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', PropertyIsDummy.name);
		withDummyDiagnostics = await utils.getDiagnostics('ZParent.PROC', PropertyIsDummy.name);
	});

	test('Upper case literal report', () => {
		expect(utils.diagnosticsOnLine(5, literalDiagnostics).length).toBe(1);
	});

	test('Camel case literal report', () => {
		expect(utils.diagnosticsOnLine(4, camelCaseDiagnostics).length).toBe(1);
	});

	test('More than 25 characters', () => {
		expect(utils.diagnosticsOnLine(14, lengthDiagnostics).length).toBe(1);
	});

	test('Starts with v', () => {
		const diagnosticsOnLine = utils.diagnosticsOnLine(23, vDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`Declaration "vString" starts with 'v'.`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Warning);
	});
	test('Public starts with v', () => {
		const diagnosticsOnLine = utils.diagnosticsOnLine(24, vDiagnostics);
		expect(diagnosticsOnLine.length).toBe(1);
		expect(diagnosticsOnLine[0].message).toBe(`Declaration "vNumber" is public and starts with 'v'.`);
		expect(diagnosticsOnLine[0].severity).toBe(api.DiagnosticSeverity.Information);
	});

	test('Property was not called \'dummy\'', () => {
		expect(withoutDummyDiagnostics.length).toBe(0);
	});

	test('Property was called \'dummy\'', () => {
		expect(utils.diagnosticsOnLine(2, withDummyDiagnostics).length).toBe(1);
	});

});
