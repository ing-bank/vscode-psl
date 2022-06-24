import * as api from '../src/pslLint/api';
import { PropertyIsDuplicate } from '../src/pslLint/elementsConventionChecker';
import * as utils from './ruleUtils';

describe('Parameter tests', () => {

	let propertyisDuplicate: api.Diagnostic[] = [];

	beforeAll(async () => {
		propertyisDuplicate = await utils.getDiagnostics('ZDuplicateProperty.PROC', PropertyIsDuplicate.name);
	});

	test('line 1', () => {
		const diagnostics = utils.diagnosticsOnLine(1, propertyisDuplicate);
		expect(diagnostics.length).toBe(0);
	});

	test('line 2', () => {
		const diagnostics = utils.diagnosticsOnLine(2, propertyisDuplicate);
		expect(diagnostics.length).toBe(0);
	});

	test('line 3', () => {
		const test1Message = 'Property "aCCount" is already declared with different case.';
		const diagnostics = utils.diagnosticsOnLine(3, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 4', () => {
		const test1Message = 'Property "accounT" is already declared with different case.';
		const diagnostics = utils.diagnosticsOnLine(4, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 5', () => {
		const diagnostics = utils.diagnosticsOnLine(5, propertyisDuplicate);
		expect(diagnostics.length).toBe(0);
	});

	test('line 6', () => {
		const test1Message = 'Property "customer" is already declared.';
		const diagnostics = utils.diagnosticsOnLine(6, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 7', () => {
		const test1Message = 'Property "array" is already declared.';
		const diagnostics = utils.diagnosticsOnLine(7, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 8', () => {
		const test1Message = 'Property "aRRay" is already declared with different case.';
		const diagnostics = utils.diagnosticsOnLine(8, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 9', () => {
		const test1Message = 'Property "array" is already declared.';
		const diagnostics = utils.diagnosticsOnLine(9, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 10', () => {
		const test1Message = 'Property "array" is already declared.';
		const diagnostics = utils.diagnosticsOnLine(10, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 11', () => {
		const diagnostics = utils.diagnosticsOnLine(11, propertyisDuplicate);
		expect(diagnostics.length).toBe(0);
	});

	test('line 12', () => {
		const test1Message = 'Property "customer" is already declared.';
		const diagnostics = utils.diagnosticsOnLine(12, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

	test('line 13', () => {
		const test1Message = 'Property "inliteral" is already declared with different case.';
		const diagnostics = utils.diagnosticsOnLine(13, propertyisDuplicate);
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].message).toBe(test1Message);
	});

});
