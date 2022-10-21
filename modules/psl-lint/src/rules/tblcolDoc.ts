import * as path from 'path';
import { Range } from 'psl-parser';
import { Diagnostic, DiagnosticSeverity, FileDefinitionRule } from '../api';

/**
 * Checks whether table and columns are created with documentation.
 */
export class TblColDocumentation extends FileDefinitionRule {

	report(): Diagnostic[] {
		const baseName = path.basename(this.profileComponent.fsPath);

		const diagnostics: Diagnostic[] = [];
		const bracketMatch = this.profileComponent.textDocument.match(/^}/m);
		// Exit if no match found
		if (!bracketMatch) return [];

		const characterOffset = bracketMatch.index;
		const endPos = this.profileComponent.textDocument.length;
		const tblColDoc = this.profileComponent.textDocument.substring(characterOffset + 1, endPos).trim();

		if (!tblColDoc) {
			let message: string;

			if (baseName.endsWith('TBL')) {
				message = `Documentation missing for table definition "${baseName}".`;
			}
			else message = `Documentation missing for data item "${baseName}".`;
			const position = this.profileComponent.positionAt(characterOffset);
			const range = new Range(position, position);
			diagnostics.push(addDiagnostic(range, message, this.ruleName));
		}

		return diagnostics;
	}

}

function addDiagnostic(range: Range, message: string, ruleName: string): Diagnostic {
	const diagnostic = new Diagnostic(range, message, ruleName, DiagnosticSeverity.Information);
	diagnostic.source = 'lint';
	return diagnostic;
}
