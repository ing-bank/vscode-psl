import * as api from '../src/pslLint/api';
import { MultiLineDeclare } from '../src/pslLint/multiLineDeclare';
import * as utils from './ruleUtils';

describe('Parameter tests', () => {

	let multiLineDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		multiLineDiagnostics = await utils.getDiagnostics('ZMultiLineDeclare.PROC', MultiLineDeclare.name);
	});

	test('line 2', () => {
		const test1Message = 'Declaration test1 should be initialized on a new line.';
		const test2Message = 'Declaration test2 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(1, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(test1Message);
		expect(diagnostics[1].message).toBe(test2Message);
	});

	test('line 3', () => {
		const number1Message = 'Declaration number1 should be initialized on a new line.';
		const number2Message = 'Declaration number2 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(2, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(number1Message);
		expect(diagnostics[1].message).toBe(number2Message);
	});

	test('line 4', () => {
		const rs1Message = 'Declaration rs1 should be initialized on a new line.';
		const rs2Message = 'Declaration rs2 should be initialized on a new line.';
		const rs3Message = 'Declaration rs3 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(3, multiLineDiagnostics);
		expect(diagnostics.length).toBe(3);
		expect(diagnostics[0].message).toBe(rs1Message);
		expect(diagnostics[1].message).toBe(rs2Message);
		expect(diagnostics[2].message).toBe(rs3Message);
	});

	test('line 5', () => {
		const diagnostics = utils.diagnosticsOnLine(4, multiLineDiagnostics);
		expect(diagnostics.length).toBe(0);
	});

	test('line 6', () => {
		const number11Message = 'Declaration number11 should be initialized on a new line.';
		const number13Message = 'Declaration number13 should be initialized on a new line.';
		const number15Message = 'Declaration number15 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(5, multiLineDiagnostics);
		expect(diagnostics.length).toBe(3);
		expect(diagnostics[0].message).toBe(number11Message);
		expect(diagnostics[1].message).toBe(number13Message);
		expect(diagnostics[2].message).toBe(number15Message);
	});

	test('line 7', () => {
		const number19Message = 'Declaration number19 should be initialized on a new line.';
		const number20Message = 'Declaration number20 should be initialized on a new line.';
		const number21Message = 'Declaration number21 should be initialized on a new line.';
		const number22Message = 'Declaration number22 should be initialized on a new line.';
		const number23Message = 'Declaration number23 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(6, multiLineDiagnostics);
		expect(diagnostics.length).toBe(5);
		expect(diagnostics[0].message).toBe(number19Message);
		expect(diagnostics[1].message).toBe(number20Message);
		expect(diagnostics[2].message).toBe(number21Message);
		expect(diagnostics[3].message).toBe(number22Message);
		expect(diagnostics[4].message).toBe(number23Message);
	});

	test('line 8', () => {
		const diagnostics = utils.diagnosticsOnLine(7, multiLineDiagnostics);
		expect(diagnostics.length).toBe(0);
	});

	test('line 9', () => {
		const number32Message = 'Declaration number32 should be initialized on a new line.';
		const number34Message = 'Declaration number34 should be initialized on a new line.';
		const number36Message = 'Declaration number36 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(8, multiLineDiagnostics);
		expect(diagnostics.length).toBe(3);
		expect(diagnostics[0].message).toBe(number32Message);
		expect(diagnostics[1].message).toBe(number34Message);
		expect(diagnostics[2].message).toBe(number36Message);
	});

	test('line 10', () => {
		const number37Message = 'Declaration number37 should be initialized on a new line.';
		const number38Message = 'Declaration number38 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(9, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(number37Message);
		expect(diagnostics[1].message).toBe(number38Message);
	});

	test('line 11', () => {
		const rs4Message = 'Declaration rs4 should be initialized on a new line.';
		const rs5Message = 'Declaration rs5 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(10, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(rs4Message);
		expect(diagnostics[1].message).toBe(rs5Message);
	});

	test('line 12', () => {
		const number38Message = 'Declaration number38 should be initialized on a new line.';
		const number39Message = 'Declaration number39 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(11, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(number38Message);
		expect(diagnostics[1].message).toBe(number39Message);
	});

	test('line 13', () => {
		const number40Message = 'Declaration number40 should be initialized on a new line.';
		const number41Message = 'Declaration number41 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(12, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(number40Message);
		expect(diagnostics[1].message).toBe(number41Message);
	});

	test('line 14', () => {
		const number42Message = 'Declaration number42 should be initialized on a new line.';
		const number41Message = 'Declaration number41 should be initialized on a new line.';
		const number43Message = 'Declaration number43 should be initialized on a new line.';
		const diagnostics = utils.diagnosticsOnLine(13, multiLineDiagnostics);
		expect(diagnostics.length).toBe(3);
		expect(diagnostics[0].message).toBe(number42Message);
		expect(diagnostics[1].message).toBe(number41Message);
		expect(diagnostics[2].message).toBe(number43Message);
	});

});
