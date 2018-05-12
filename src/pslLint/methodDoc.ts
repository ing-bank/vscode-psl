import { Diagnostic, DiagnosticSeverity, Rule, PslDocument } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements Rule {

	report(pslDocument: PslDocument): Diagnostic[] {

		let diagnostics: Diagnostic[] = [];
		pslDocument.parsedDocument.methods.forEach(method => {
			if (method.batch) return;
			let nextLineContent: string = pslDocument.getTextAtLine(method.nextLine);
			let prevLineContent: string = pslDocument.getTextAtLine(method.prevLine);
			let idToken = method.id;

			if (!(prevLineContent.trim().startsWith('//'))) {
				let message = `Seperator missing for label "${idToken.value}"`;
				let range = idToken.getRange();
				let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
			}

			if (!(nextLineContent.trim().startsWith('/*'))) {
				let message = `Documentation missing for label "${idToken.value}"`;
				let range = idToken.getRange();
				let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
			}
		});
		return diagnostics;
	}
}