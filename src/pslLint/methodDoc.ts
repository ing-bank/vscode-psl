import { Diagnostic, DiagnosticSeverity, MethodRule, PslDocument, Method, Token } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements MethodRule {

	ruleName = MethodDocumentation.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		let diagnostics: Diagnostic[] = [];

		let nextLineContent: string = pslDocument.getTextAtLine(method.nextLine);
		let idToken = method.id;
		if (!(nextLineContent.trim().startsWith('/*'))) {
			let message = `Documentation missing for label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName));
		}

		return diagnostics;
	}
}
export class MethodSeparator implements MethodRule {

	ruleName = MethodSeparator.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		let diagnostics: Diagnostic[] = [];

		let prevLineContent: string = pslDocument.getTextAtLine(method.prevLine);
		let idToken = method.id;

		if (!(prevLineContent.trim().startsWith('//'))) {
			let message = `Separator missing for label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName));
		}

		return diagnostics;
	}
}

export class TwoEmptyLines implements MethodRule {

	ruleName = TwoEmptyLines.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		let diagnostics: Diagnostic[] = [];

		let contentOneLineB4: string = pslDocument.getTextAtLine(method.oneLineB4);
		let contentTwoLineB4: string = pslDocument.getTextAtLine((method.oneLineB4 - 1));
		let contentThreeLinesB4: string = pslDocument.getTextAtLine((method.oneLineB4 - 2));
		let idToken = method.id;
		let addOneLine:boolean = false;
		let addTwoLines:boolean = false;

		if (!(contentTwoLineB4.trim() === "")) addOneLine = true;
		if (!(contentOneLineB4.trim() === "")) addTwoLines = true;

		// Checks two empty lines above a method
		if (!((contentOneLineB4.trim() === "") && (contentTwoLineB4.trim() === ""))) {
			let message = `There should be two empty lines before method "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName, addOneLine, addTwoLines));
		}

		//Check more than 2 empty lines above a method
		if ((contentOneLineB4.trim() === "") && (contentTwoLineB4.trim() === "") && (contentThreeLinesB4.trim() === "")) {
			let message = `There are more than two empty lines before method "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName, addOneLine, addTwoLines));
		}

		return diagnostics;
	}
}

function addDiagnostic(idToken: Token, method: Method, message: string, ruleName: string, addOneLine?:boolean, addTwoLines?:boolean): Diagnostic {
	let range = idToken.getRange();
	let diagnostic = new Diagnostic(range, message,ruleName, DiagnosticSeverity.Information);
	diagnostic.source = 'lint';
	diagnostic.member = method;
	diagnostic.addOneLine = addOneLine
	diagnostic.addTwoLines = addTwoLines
	return diagnostic;
}
