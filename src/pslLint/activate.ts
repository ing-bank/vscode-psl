import { Document, Diagnostic, Rule } from './api';
import { ParametersOnNewLine } from './parameters';
import { TodoInfo } from './todos';

function registerRules(rules: Rule[]) {
	rules.push(new ParametersOnNewLine());

	rules.push(new TodoInfo());
}

export function getDiagnostics(parsedDocument: Document, textDocument: string) {
	let rules: Rule[] = [];
	let diagnostics: Diagnostic[] = []
	registerRules(rules);
	rules.forEach(rule => {
		diagnostics = diagnostics.concat(rule.report(parsedDocument, textDocument));
	})
	return diagnostics;
}