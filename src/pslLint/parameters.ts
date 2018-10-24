import { Diagnostic, DiagnosticSeverity, Method, MethodRule, Parameter, PslDocument } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodParametersOnNewLine implements MethodRule {

	ruleName = MethodParametersOnNewLine.name;

	report(_pslDocument: PslDocument, method: Method): Diagnostic[] {

		if (method.batch) return [];

		const diagnostics: Diagnostic[] = [];
		const methodLine = method.id.position.line;

		let previousParam: Parameter | undefined;
		for (const param of method.parameters) {
			const paramPosition = param.id.position;
			if (previousParam && paramPosition.line === previousParam.id.position.line) {
				const message = `Parameter "${param.id.value}" on same line as parameter "${previousParam.id.value}".`;
				const diagnostic = new Diagnostic(param.id.getRange(), message, this.ruleName, DiagnosticSeverity.Warning);
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
			}
			else if (method.parameters.length > 1 && paramPosition.line === methodLine) {
				const message = `Parameter "${param.id.value}" on same line as label "${method.id.value}".`;
				const diagnostic = new Diagnostic(param.id.getRange(), message, this.ruleName, DiagnosticSeverity.Warning);
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
			}
			previousParam = param;
		}

		return diagnostics;
	}
}
