import { MethodRule, PslDocument, Method, Declaration, Diagnostic, DiagnosticSeverity, Token } from "./api";
import { Value, Statement } from "../parser/parser";

export class RuntimeStart implements MethodRule {
	ruleName = RuntimeStart.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		let runtimes: Statement[] = method.statements.filter(statement => {
			let value = statement.expression.data as Value;
			return statement.action.value === 'do' && value.id.value === 'Runtime';
		})
		if (!runtimes.length) return [];

		let diagnostics: Diagnostic[] = [];
		this.tpFence(diagnostics, runtimes, pslDocument.parsedDocument.tokens, method);
		return diagnostics;
	}

	tpFence(diagnostics: Diagnostic[], runtimes: Statement[], tokens: Token[], method: Method) {
		let tpLevel: Value[] = [];
		let lastStart;
		for (let i = 0; i < runtimes.length; i++) {
			const runtimeMethod = (runtimes[i].expression.data as Value).child;
			if (runtimeMethod.id.value === 'start') {
				lastStart = runtimeMethod;
				tpLevel.push(runtimeMethod);
			}
			else if (runtimeMethod.id.value === 'commit') {
				let start = tpLevel.pop();
				if (!start && !lastStart) diagnostics.push(new Diagnostic(runtimeMethod.child.id.getRange(), `Runtime commit without start.`, DiagnosticSeverity.Warning));
				else {
					if (!start) start = lastStart;
					let startLine = start.id.position.line;
					let commitLine = runtimeMethod.id.position.line;
					let fenceTokens: Token[] = this.scanTokens(tokens, startLine, commitLine);
					let localVariablesOutsideStart: Declaration[] = method.declarations.filter(d => d.id.position.line <= startLine);
					let variables: Set<Declaration> = new Set();
					for (const token of fenceTokens) {
						let variable = localVariablesOutsideStart.find(v => v.id.value === token.value);
						if (variable) {
							let varList = start.args[1];
							if (!varList || varList.id.value.split(',').indexOf(variable.id.value) === -1) {
								variables.add(variable);
							}
						}
					}
					variables.forEach(variable => {
						let diag = new Diagnostic(start.id.getRange(), `Declaration "${variable.id.value}" referenced inside Runtime.start but not in variable list.`, DiagnosticSeverity.Warning, variable);
						diag.source = 'tpfence';
						diagnostics.push(diag);
					})
				}
			}
		}

	}
	scanTokens(tokens: Token[], startLine: number, commitLine: number): Token[] {
		let rets = tokens.filter(token => {
			return token.position.line >= startLine && token.position.line <= commitLine;
		})
		return rets;
	}
}
