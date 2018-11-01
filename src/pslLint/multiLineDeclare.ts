import {
	Declaration, Diagnostic, DiagnosticSeverity, getTokens,
	Method, MethodRule, NON_TYPE_MODIFIERS, PslDocument,
} from './api';

export class MultiLineDeclare implements MethodRule {
	ruleName = MultiLineDeclare.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		const diagnostics: Diagnostic[] = [];
		let reportVariable: boolean = false;

		const multiLineDeclarations = this.getMultiLineDeclarations(method.declarations);

		multiLineDeclarations.forEach((declarationsOnLine, lineNumber) => {
			const fullLine = pslDocument.getTextAtLine(lineNumber);
			if (!(fullLine.includes('=') && fullLine.includes(','))) return;
			for (const declaration of declarationsOnLine) {
				reportVariable = false;
				let conditionOpen: boolean = false;
				let commaFound: boolean = false;
				let conditionClose: boolean = false;
				let typePresent: boolean = false;
				for (const token of getTokens(fullLine)) {
					if (token.isWhiteSpace()) continue;
					if (token.isDoubleQuotes()) continue;
					if (token.isBlockCommentInit()) continue;
					if ((token.value) === 'type') {
						typePresent = true;
						continue;
					}
					if (NON_TYPE_MODIFIERS.indexOf(token.value) > -1) {
						continue;
					}
					if (declaration.types.map(t => t.value).indexOf(token.value) > -1) {
						continue;
					}
					if (token.isOpenParen()) {
						conditionOpen = true;
						conditionClose = false;
						continue;
					}
					if (conditionOpen && token.isCloseParen()) {
						conditionClose = true;
						continue;
					}
					if (token.isComma()) {
						commaFound = true;
						continue;
					}
					if (commaFound && token.isEqualSign() && typePresent && conditionOpen === conditionClose) {
						conditionOpen = false;
						conditionClose = false;
						commaFound = false;
						reportVariable = true;
					}
				}
				if (reportVariable) {
					const diagnostic = new Diagnostic(
						declaration.id.getRange(),
						`Declaration ${declaration.id.value} should be initialized on a new line.`,
						this.ruleName,
						DiagnosticSeverity.Warning,
					);
					diagnostic.source = 'lint';
					diagnostics.push(diagnostic);
				}
			}
		});
		return diagnostics;
	}
	getMultiLineDeclarations(declarations: Declaration[]): Map<number, Declaration[]> {
		const data = new Map<number, Declaration[]>();
		declarations.forEach(declaration => {
			const lineNumber = declaration.id.position.line;
			const declarationsOnLine = data.get(lineNumber);
			if (declarationsOnLine) declarationsOnLine.push(declaration);
			else data.set(lineNumber, [declaration]);
		});
		data.forEach((declarationArray, lineNumber) => {
			if (declarationArray.length <= 1) {
				data.delete(lineNumber);
			}
		});
		return data;
	}
}
