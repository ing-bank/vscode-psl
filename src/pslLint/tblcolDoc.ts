import * as path from 'path';
import { Range } from '../parser/tokenizer';
import { Diagnostic, DiagnosticSeverity, ProfileComponentRule } from './api';

/**
 * Checks whether table and columns are created with documentation.
 */
export class TblColDocumentation extends ProfileComponentRule {

	report(): Diagnostic[] {
		const baseName = path.basename(this.profileComponent.fsPath);

		// This rule is applicable only for TBL and COL definitions
		if ((!baseName.endsWith('TBL')) && (!baseName.endsWith('COL'))) return [];

		const diagnostics: Diagnostic[] = [];

		const charcterOffset = this.profileComponent.textDocument.match(/^}/m).index;
		const endPos = this.profileComponent.textDocument.length;
		const tblColDoc = this.profileComponent.textDocument.substring(charcterOffset + 1, endPos).trim();

		if (!tblColDoc) {
			let message;

			if (baseName.endsWith('TBL')) {
				message = `Documentation missing for table definition "${baseName}".`;
			}
			else message = `Documentation missing for data item "${baseName}".`;
			const position = this.profileComponent.positionAt(charcterOffset);
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
