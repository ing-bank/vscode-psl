import * as fs from 'fs-extra';
import * as path from 'path';
import * as activate from '../src/pslLint/activate';
import * as api from '../src/pslLint/api';

/**
 * Returns the specific diagnostics on a given line
 *
 * @param lineNumber Zero-based line number to check, i.e. line 1 of the document is lineNumber 0.
 * @param diagnostics The reports to filter
 */
export function diagnosticsOnLine(lineNumber: number, diagnostics: api.Diagnostic[]): api.Diagnostic[] {
	const lineDiagnostics = diagnostics.filter(r => r.range.start.line === lineNumber);
	return lineDiagnostics;
}

/**
 * Gets the diagnostics for the given file.
 *
 * @param testFileName The name of the file located in `${PROJECT_ROOT}/__tests__/files/`
 * @param ruleName Optional parameter to return only diagnostics corresponding to the ruleName
 */
export async function getDiagnostics(testFileName: string, ruleName?: string): Promise<api.Diagnostic[]> {
	const testFilePath = path.resolve('__tests__', 'files', testFileName);
	const text = await fs.readFile(testFilePath).then(b => b.toString());

	const pslDocument = new api.PslDocument(api.parseText(text), text, testFilePath);
	const diagnostics = activate.getDiagnostics(pslDocument, false);
	if (ruleName) return diagnostics.filter(d => d.ruleName === ruleName);
	return diagnostics;
}
