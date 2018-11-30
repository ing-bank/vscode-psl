import * as api from '../src/pslLint/api';
import { TblColDocumentation } from '../src/pslLint/tblcolDoc';
import * as utils from './ruleUtils';

function messageOnLine(lineNumber: number, allDiagnostics: api.Diagnostic[]): string {
	const diagnosticsOnLine = utils.diagnosticsOnLine(lineNumber, allDiagnostics);
	if (!diagnosticsOnLine.length) return '';
	return diagnosticsOnLine[0].message;
}

describe('Table and Column Documentation tests', () => {

	let bracesInColDocDiagnostics: api.Diagnostic[] = [];
	let withColDocDiagnostics: api.Diagnostic[] = [];
	let withoutColDocDiagnostics: api.Diagnostic[] = [];
	let withSpaceColDocDiagnostics: api.Diagnostic[] = [];
	let bracesInsideColDefDiagnostics: api.Diagnostic[] = [];
	let withoutClosedBracesColDiagnostics: api.Diagnostic[] = [];

	let bracesInTblDocDiagnostics: api.Diagnostic[] = [];
	let withTblDocDiagnostics: api.Diagnostic[] = [];
	let withoutTblDocDiagnostics: api.Diagnostic[] = [];
	let withSpaceTblDocDiagnostics: api.Diagnostic[] = [];
	let bracesInsideTblDefDiagnostics: api.Diagnostic[] = [];
	let withoutClosedBracesTblDiagnostics: api.Diagnostic[] = [];

	beforeAll(async () => {
		bracesInColDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col1.COL', TblColDocumentation.name);
		withColDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col2.COL', TblColDocumentation.name);
		withoutColDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col3.COL', TblColDocumentation.name);
		withSpaceColDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col4.COL', TblColDocumentation.name);
		bracesInsideColDefDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col5.COL', TblColDocumentation.name);
		withoutClosedBracesColDiagnostics = await utils.getDiagnostics('ZTblColDocTst-Col6.COL', TblColDocumentation.name);

		bracesInTblDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst1.TBL', TblColDocumentation.name);
		withTblDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst2.TBL', TblColDocumentation.name);
		withoutTblDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst3.TBL', TblColDocumentation.name);
		withSpaceTblDocDiagnostics = await utils.getDiagnostics('ZTblColDocTst4.TBL', TblColDocumentation.name);
		bracesInsideTblDefDiagnostics = await utils.getDiagnostics('ZTblColDocTst5.TBL', TblColDocumentation.name);
		withoutClosedBracesTblDiagnostics = await utils.getDiagnostics('ZTblColDocTst6.TBL', TblColDocumentation.name);
	});

	test('Column documentation', () => {
		// Column documentation exists with '{' '}' braces
		expect(bracesInColDocDiagnostics.length).toBe(0);
		// Column documentation exists
		expect(withColDocDiagnostics.length).toBe(0);
		// Without } in the column definition.This should be ignored as the compiler should handle it
		expect(withoutClosedBracesColDiagnostics.length).toBe(0);
		// Without Column documentation and '{' '}' inside the definition
		expect(bracesInsideColDefDiagnostics.length).toBe(0);
		// Without Column documentation
		expect(messageOnLine(36, withoutColDocDiagnostics))
			.toBe(`Documentation missing for data item "ZTblColDocTst-Col3.COL".`);
		// Without Column documentation but only space exists after '}' braces
		expect(messageOnLine(36, withSpaceColDocDiagnostics))
			.toBe(`Documentation missing for data item "ZTblColDocTst-Col4.COL".`);
	});

	test('Table documentation', () => {
		// Table documentation exists with '{' '}' braces
		expect(bracesInTblDocDiagnostics.length).toBe(0);
		// Table documentation exists
		expect(withTblDocDiagnostics.length).toBe(0);
		// Without } in the Table definition.This should be ignored as the compiler should handle it
		expect(withoutClosedBracesTblDiagnostics.length).toBe(0);
		// Without Table documentation and '{' '}' inside the definition
		expect(bracesInsideTblDefDiagnostics.length).toBe(0);
		// Without Table documentation
		expect(messageOnLine(41, withoutTblDocDiagnostics))
			.toBe(`Documentation missing for table definition "ZTblColDocTst3.TBL".`);
		// Without Table documentation but only space exists after '}' braces
		expect(messageOnLine(41, withSpaceTblDocDiagnostics))
			.toBe(`Documentation missing for table definition "ZTblColDocTst4.TBL".`);
	});
});
