import * as api from '../src/pslLint/api';
import * as utils from './ruleUtils';
import { MultiLineDeclare } from '../src/pslLint/mutliLineDeclare';

describe('Parameter tests', () => {

	let multiLineDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		multiLineDiagnostics = await utils.getDiagnostics('ZMultiLineDeclare.PROC', MultiLineDeclare.name);
	})

	test('Report x and y', () => {
		let lineNumber = 1
		const xMessage = 'Multiple Declared and Valued variables are in the same line x'
		const yMessage = 'Multiple Declared and Valued variables are in the same line y'
		const diagnostics = utils.diagnosticsOnLine(lineNumber, multiLineDiagnostics);
		expect(diagnostics.length).toBe(2);
		expect(diagnostics[0].message).toBe(xMessage);
		expect(diagnostics[1].message).toBe(yMessage);
	})

})
