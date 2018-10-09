import * as api from '../src/pslLint/api';
import * as utils from './ruleUtils';
import { MemberLiteralCase, MemberCamelCase, MemberLength, MemberStartsWithV } from '../src/pslLint/elementsConventionChecker';

describe('Members tests', () => {
	let literalDiagnostics: api.Diagnostic[] = [];
	let camelCaseDiagnostics: api.Diagnostic[] = [];
	let lengthDiagnostics: api.Diagnostic[] = [];
	let vDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		literalDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberLiteralCase.name);
		camelCaseDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberCamelCase.name);
		lengthDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberLength.name);
		vDiagnostics = await utils.getDiagnostics('ZTestConvention.PROC', MemberStartsWithV.name);
	})

	test('Upper case literal report', () => {
		expect(utils.diagnosticsOnLine(5, literalDiagnostics).length).toBe(1)
	})

	test('Camel case literal report', () => {
		expect(utils.diagnosticsOnLine(4, camelCaseDiagnostics).length).toBe(1)
	})


	test('More than 25 characters', () => {
		expect(utils.diagnosticsOnLine(14, lengthDiagnostics).length).toBe(1);
	})

	test('Starts with v', () => {
		expect(utils.diagnosticsOnLine(23, vDiagnostics).length).toBe(1);
	})
})
