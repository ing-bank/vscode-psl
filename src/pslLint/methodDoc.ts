import { Diagnostic, DiagnosticSeverity, getLineAfter, Method, MethodRule, PslDocument, Token } from './api';

export enum Code {
	ONE_EMPTY_LINE = 1,
	TWO_EMPTY_LINES = 2,
}

/**
 * Checks if method has a documentation block below it.
 */
export class MethodDocumentation implements MethodRule {

	ruleName = MethodDocumentation.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		const diagnostics: Diagnostic[] = [];

		if (!hasBlockComment(method, pslDocument)) {
			const idToken = method.id;
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

		if (!hasSeparator(method, pslDocument)) {
			const idToken = method.id;
			const message = `Separator missing for label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName));
		}

		return diagnostics;
	}
}

export class TwoEmptyLines implements MethodRule {

	ruleName = TwoEmptyLines.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		const diagnostics: Diagnostic[] = [];
		const idToken = method.id;

		const lineAbove = hasSeparator(method, pslDocument) ? method.id.position.line - 2 : method.id.position.line - 1;

		if (lineAbove < 2) {
			const message = `There should be two empty lines above label "${idToken.value}".`;
			return [addDiagnostic(idToken, method, message, this.ruleName, Code.TWO_EMPTY_LINES)];
		}

		const hasOneSpaceAbove: boolean = pslDocument.getTextAtLine(lineAbove).trim() === '';
		const hasTwoSpacesAbove: boolean = pslDocument.getTextAtLine(lineAbove - 1).trim() === '';
		const hasThreeSpacesAbove: boolean = pslDocument.getTextAtLine(lineAbove - 2).trim() === '';

		let code: Code | undefined;
		if (!hasTwoSpacesAbove) code = Code.ONE_EMPTY_LINE;
		if (!hasOneSpaceAbove) code = Code.TWO_EMPTY_LINES;

		// Checks two empty lines above a method
		if (!hasOneSpaceAbove || !hasTwoSpacesAbove || lineAbove <= 0) {
			const message = `There should be two empty lines above label "${idToken.value}".`;
			diagnostics.push(addDiagnostic(idToken, method, message, this.ruleName, code));
		}

		// Check more than 2 empty lines above a method
		if (hasOneSpaceAbove && hasTwoSpacesAbove && hasThreeSpacesAbove) {
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

function hasSeparator(method: Method, pslDocument: PslDocument): boolean {
	const nextLineCommentTokens: Token[] = pslDocument.getCommentsOnLine(method.id.position.line - 1);
	return nextLineCommentTokens[0] && nextLineCommentTokens[0].isLineComment();
}

function hasBlockComment(method: Method, pslDocument: PslDocument): boolean {
	const nextLineCommentTokens: Token[] = pslDocument.getCommentsOnLine(getLineAfter(method));
	return nextLineCommentTokens[0] && nextLineCommentTokens[0].isBlockComment();
}
