import { Diagnostic, DiagnosticSeverity, Rule, Document } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements Rule {

	report(doc: Document): Diagnostic[] {

		let diagnostics: Diagnostic[] = [];
		doc.parsedDocument.methods.forEach(method => {
			if (method.batch) return;
			let nextLineContent: string = doc.getTextAtLine(method.nextLine);
			let prevLineContent: string = doc.getTextAtLine(method.prevLine);
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