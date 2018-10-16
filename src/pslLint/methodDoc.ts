import { Diagnostic, DiagnosticSeverity, Method, MethodRule, PslDocument, Token, getLineAfter } from './api';

enum Code {
	ONE_EMPTY_LINE = 1,
	TWO_EMPTY_LINES = 2
}

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements MethodRule {

	ruleName = MethodDocumentation.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		const diagnostics: Diagnostic[] = [];

		const nextLineContent: string = pslDocument.getTextAtLine(getLineAfter(method));
		const idToken = method.id;
		if (!(nextLineContent.trim().startsWith('/*'))) {
			const message = `Documentation missing for label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName));
		}

		return diagnostics;
	}
}
export class MethodSeparator implements MethodRule {

	ruleName = MethodSeparator.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		const diagnostics: Diagnostic[] = [];
		const idToken = method.id;

		if (!previousLineIsSeparator(method, pslDocument)) {
			const message = `Separator missing for label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName));
		}

		return diagnostics;
	}
}

export class TwoEmptyLines implements MethodRule {

	ruleName = TwoEmptyLines.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		const diagnostics: Diagnostic[] = [];

		const hasSeparator = previousLineIsSeparator(method, pslDocument);
		const lineAbove: number = hasSeparator ? method.id.position.line - 2 : method.id.position.line - 1;

		const oneSpaceAbove: string = pslDocument.getTextAtLine(lineAbove).trim();
		const twoSpacesAbove: string = pslDocument.getTextAtLine(lineAbove - 1).trim();
		const threeSpacesAbove: string = pslDocument.getTextAtLine(lineAbove - 2).trim();

		const idToken = method.id;
		let code: Code;

		if (!twoSpacesAbove) code = Code.ONE_EMPTY_LINE;
		if (!oneSpaceAbove) code = Code.TWO_EMPTY_LINES;

		// Checks two empty lines above a method
		if (oneSpaceAbove || twoSpacesAbove || lineAbove <= 0) {
			const message = `There should be two empty lines above label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName, code));
		}

		// Check more than 2 empty lines above a method
		if (oneSpaceAbove && twoSpacesAbove && threeSpacesAbove) {
			const message = `There are more than two empty lines above label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName, code));
		}

		return diagnostics;
	}
}

function addDiagnostic(idToken: Token, method: Method, message: string, ruleName: string, code?: Code): Diagnostic {
	const range = idToken.getRange();
	const diagnostic = new Diagnostic(range, message, ruleName, DiagnosticSeverity.Information);
	diagnostic.source = 'lint';
	diagnostic.member = method;
	if (code) diagnostic.code = code;
	return diagnostic;
}

function previousLineIsSeparator(method: Method, pslDocument: PslDocument): boolean {
	const prevLineContent: string = pslDocument.getTextAtLine(method.id.position.line - 1);
	return prevLineContent.trim().startsWith('//');
}
