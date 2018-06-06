import { Diagnostic, DiagnosticSeverity, MethodRule, PslDocument, Method, Token } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements MethodRule {

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		let diagnostics: Diagnostic[] = [];

		let nextLineContent: string = pslDocument.getTextAtLine(method.nextLine);
		let idToken = method.id;
		if (!(nextLineContent.trim().startsWith('/*'))) {
			let message = `Documentation missing for label "${idToken.value}"`;
			diagnostics.push(addDiagnostic(idToken, method, message));
		}

		return diagnostics;
	}
}
export class MethodSeparator implements MethodRule {

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		let diagnostics: Diagnostic[] = [];

		let prevLineContent: string = pslDocument.getTextAtLine(method.prevLine);
		let idToken = method.id;

		if (!(prevLineContent.trim().startsWith('//'))) {
			let message = `Separator missing for label "${idToken.value}"`;
			diagnostics.push(addDiagnostic(idToken, method, message));
		}

		return diagnostics;
	}
}

function addDiagnostic(idToken: Token, method: Method, message: string): Diagnostic {
	let range = idToken.getRange();
	let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
	diagnostic.source = 'lint';
	diagnostic.member = method;
	return diagnostic;
}
