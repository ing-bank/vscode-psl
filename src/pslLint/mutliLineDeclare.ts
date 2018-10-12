import { NON_TYPE_MODIFIERS } from '../parser/parser';
import { Diagnostic, DiagnosticSeverity, getTokens, Method, MethodRule, PslDocument} from './api';

export class MultiLineDeclare implements MethodRule {
	ruleName = MultiLineDeclare.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		const diagnostics: Diagnostic[] = [];
		let prevDeclarationLine: number;
		let reportAllVariables: boolean = false;

		for (const declaration of method.declarations) {
			const curDeclaration = declaration;
			const fullLine = pslDocument.getTextAtLine(curDeclaration.id.position.line);

			if (!(prevDeclarationLine && prevDeclarationLine === curDeclaration.id.position.line)) {
				reportAllVariables = false;

				if (!(fullLine.includes('=') && fullLine.includes(','))) continue;
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
					if (curDeclaration.types.map(t => t.value).indexOf(token.value) > -1) {
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
						conditionOpen =  false;
						conditionClose = false;
						commaFound = false;
						reportAllVariables =  true;
					}
				}
			}
			prevDeclarationLine = curDeclaration.id.position.line;
			if (reportAllVariables) {
				const diag = new Diagnostic(curDeclaration.id.getRange(), `Declaration ${curDeclaration.id.value} should be initialized on a new line`, this.ruleName, DiagnosticSeverity.Warning);
				diag.source = 'lint';
				diagnostics.push(diag);
			}
		}
		return diagnostics;
	}
}
