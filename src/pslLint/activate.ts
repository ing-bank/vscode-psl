import { IDocument, Diagnostic, Rule } from './api';
import { ParametersOnNewLine } from './parameters';
import { TodoInfo } from './todos';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
function registerRules(rules: Rule[]) {
	rules.push(new ParametersOnNewLine());

	rules.push(new TodoInfo());
}

export function getDiagnostics(parsedDocument: IDocument, textDocument: string) {
	let rules: Rule[] = [];
	let diagnostics: Diagnostic[] = []
	registerRules(rules);
	rules.forEach(rule => {
		diagnostics = diagnostics.concat(rule.report(parsedDocument, textDocument));
	})
	return diagnostics;
}