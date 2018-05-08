import { Document, Diagnostic, Rule } from './api';

/**
 * Import rules here.
 */
import { ParametersOnNewLine } from './parameters';
import { TodoInfo } from './todos';
import { MethodDocumentation } from './methodDoc';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
function registerRules(rules: Rule[]) {
	rules.push(new ParametersOnNewLine());
	rules.push(new MethodDocumentation());
	rules.push(new TodoInfo());
}

export function getDiagnostics(parsedDocument: Document, textDocument: string) {
	let rules: Rule[] = [];
	let diagnostics: Diagnostic[] = [];
	registerRules(rules);
	rules.forEach(rule => {
		diagnostics = diagnostics.concat(rule.report(parsedDocument, textDocument));
	});
	return diagnostics;
}