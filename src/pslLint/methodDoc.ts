import { Diagnostic, DiagnosticSeverity, MethodRule, PslDocument, Method } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements MethodRule {

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {
		
		if (method.batch) return [];
		
		let diagnostics: Diagnostic[] = [];

		let nextLineContent: string = pslDocument.getTextAtLine(method.nextLine);
		let prevLineContent: string = pslDocument.getTextAtLine(method.prevLine);
		let idToken = method.id;

		if (!(prevLineContent.trim().startsWith('//'))) {
			let message = `Separator missing for label "${idToken.value}"`;
			let range = idToken.getRange();
			let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
			diagnostic.source = 'lint';
			diagnostic.member = method;
			diagnostics.push(diagnostic);
		}

		if (!(nextLineContent.trim().startsWith('/*'))) {
			let message = `Documentation missing for label "${idToken.value}"`;
			let range = idToken.getRange();
			let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
			diagnostic.source = 'lint';
			diagnostic.member = method;
			diagnostics.push(diagnostic);
		}

		return diagnostics;
	}
}