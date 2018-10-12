import * as api from '../src/pslLint/api';
import { MultiLineDeclare } from '../src/pslLint/mutliLineDeclare';
import * as utils from './ruleUtils';

describe('Parameter tests', () => {

	let multiLineDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		multiLineDiagnostics = await utils.getDiagnostics('ZMultiLineDeclare.PROC', MultiLineDeclare.name);
	});

	test('Report', () => {
		const message1 = 'Declaration test1 should be initialized on a new line';
		const message2 = 'Declaration test2 should be initialized on a new line';
		const message3 = 'Declaration number1 should be initialized on a new line';
		const message4 = 'Declaration number2 should be initialized on a new line';
		const message5 = 'Declaration rs1 should be initialized on a new line';
		const message6 = 'Declaration rs2 should be initialized on a new line';
		const message7 = 'Declaration rs3 should be initialized on a new line';
		const message8 = 'Declaration number11 should be initialized on a new line';
		const message9 = 'Declaration number13 should be initialized on a new line';
		const message10 = 'Declaration number15 should be initialized on a new line';
		const message11 = 'Declaration number19 should be initialized on a new line';
		const message12 = 'Declaration number20 should be initialized on a new line';
		const message13 = 'Declaration number21 should be initialized on a new line';
		const message14 = 'Declaration number22 should be initialized on a new line';
		const message15 = 'Declaration number23 should be initialized on a new line';
		const message16 = 'Declaration number32 should be initialized on a new line';
		const message17 = 'Declaration number34 should be initialized on a new line';
		const message18 = 'Declaration number36 should be initialized on a new line';
		const message19 = 'Declaration number37 should be initialized on a new line';
		const message20 = 'Declaration number38 should be initialized on a new line';
		const message21 = 'Declaration rs4 should be initialized on a new line';
		const message22 = 'Declaration rs5 should be initialized on a new line';
		const message23 = 'Declaration number38 should be initialized on a new line';
		const message24 = 'Declaration number39 should be initialized on a new line';
		const message25 = 'Declaration number40 should be initialized on a new line';
		const message26 = 'Declaration number41 should be initialized on a new line';
		const message27 = 'Declaration number42 should be initialized on a new line';
		const message28 = 'Declaration number41 should be initialized on a new line';
		const message29 = 'Declaration number43 should be initialized on a new line';

		const diagnostics1 = utils.diagnosticsOnLine(1, multiLineDiagnostics);
		expect(diagnostics1.length).toBe(2);
		expect(diagnostics1[0].message).toBe(message1);
		expect(diagnostics1[1].message).toBe(message2);

		const diagnostics2 = utils.diagnosticsOnLine(2, multiLineDiagnostics);
		expect(diagnostics2.length).toBe(2);
		expect(diagnostics2[0].message).toBe(message3);
		expect(diagnostics2[1].message).toBe(message4);

		const diagnostics3 = utils.diagnosticsOnLine(3, multiLineDiagnostics);
		expect(diagnostics3.length).toBe(3);
		expect(diagnostics3[0].message).toBe(message5);
		expect(diagnostics3[1].message).toBe(message6);
		expect(diagnostics3[2].message).toBe(message7);

		const diagnostics4 = utils.diagnosticsOnLine(5, multiLineDiagnostics);
		expect(diagnostics4.length).toBe(3);
		expect(diagnostics4[0].message).toBe(message8);
		expect(diagnostics4[1].message).toBe(message9);
		expect(diagnostics4[2].message).toBe(message10);

		const diagnostics5 = utils.diagnosticsOnLine(6, multiLineDiagnostics);
		expect(diagnostics5.length).toBe(5);
		expect(diagnostics5[0].message).toBe(message11);
		expect(diagnostics5[1].message).toBe(message12);
		expect(diagnostics5[2].message).toBe(message13);
		expect(diagnostics5[3].message).toBe(message14);
		expect(diagnostics5[4].message).toBe(message15);

		const diagnostics6 = utils.diagnosticsOnLine(8, multiLineDiagnostics);
		expect(diagnostics6.length).toBe(3);
		expect(diagnostics6[0].message).toBe(message16);
		expect(diagnostics6[1].message).toBe(message17);
		expect(diagnostics6[2].message).toBe(message18);

		const diagnostics7 = utils.diagnosticsOnLine(9, multiLineDiagnostics);
		expect(diagnostics7.length).toBe(2);
		expect(diagnostics7[0].message).toBe(message19);
		expect(diagnostics7[1].message).toBe(message20);

		const diagnostics8 = utils.diagnosticsOnLine(10, multiLineDiagnostics);
		expect(diagnostics8.length).toBe(2);
		expect(diagnostics8[0].message).toBe(message21);
		expect(diagnostics8[1].message).toBe(message22);

		const diagnostics9 = utils.diagnosticsOnLine(11, multiLineDiagnostics);
		expect(diagnostics9.length).toBe(2);
		expect(diagnostics9[0].message).toBe(message23);
		expect(diagnostics9[1].message).toBe(message24);

		const diagnostics10 = utils.diagnosticsOnLine(12, multiLineDiagnostics);
		expect(diagnostics10.length).toBe(2);
		expect(diagnostics10[0].message).toBe(message25);
		expect(diagnostics10[1].message).toBe(message26);

		const diagnostics11 = utils.diagnosticsOnLine(13, multiLineDiagnostics);
		expect(diagnostics11.length).toBe(3);
		expect(diagnostics11[0].message).toBe(message27);
		expect(diagnostics11[1].message).toBe(message28);
		expect(diagnostics11[2].message).toBe(message29);
	});

});
