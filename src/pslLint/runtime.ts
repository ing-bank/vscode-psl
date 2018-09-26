import { MethodRule, PslDocument, Method, Member, Diagnostic, DiagnosticSeverity, Token, DiagnosticRelatedInformation, getTokens, Position, Range } from "./api";
import { Value, Statement, MemberClass } from "../parser/parser";

export class RuntimeStart implements MethodRule {
	ruleName = RuntimeStart.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		let runtimes: Statement[] = method.statements.filter(statement => {
			let value = statement.expression.data as Value;
			return statement.action.value === 'do' && value.id.value === 'Runtime';
		})
		if (!runtimes.length) return [];

		let diagnostics: Diagnostic[] = [];
		this.tpFence(diagnostics, runtimes, pslDocument, method);
		return diagnostics;
	}

	tpFence(diagnostics: Diagnostic[], runtimes: Statement[], pslDocument: PslDocument, method: Method) {
		let lastStart: Value;
		let variables: Map<Member, Token[]>;
		let acceptVariables: string[] = [];
		for (let i = 0; i < runtimes.length; i++) {
			const runtimeMethod = (runtimes[i].expression.data as Value).child;
			if (runtimeMethod.id.value === 'start') {
				if (lastStart) {
					variables.forEach((tokens, variable) => {
						let text = pslDocument.getTextAtLine(lastStart.id.position.line);
						let startPos = text.length - text.trimLeft().length;
						let word = variable.memberClass === MemberClass.parameter ? 'Parameter' : 'Declaration';
						let diag = new Diagnostic(new Range(lastStart.id.position.line, startPos, lastStart.id.position.line, text.trimRight().length), `${word} "${variable.id.value}" referenced inside Runtime.start but not in variable list.`,this.ruleName, DiagnosticSeverity.Warning, variable);
						diag.relatedInformation = [new DiagnosticRelatedInformation(variable.id.getRange(), `Source of "${variable.id.value}"`)];
						diag.relatedInformation = diag.relatedInformation.concat(tokens.map(t => new DiagnosticRelatedInformation(t.getRange(), `Reference to "${t.value}"`)))
						diag.source = 'tpfence';
						diagnostics.push(diag);
					})
				}
				lastStart = runtimeMethod;
				variables = new Map();
				{
					let lineAbove = pslDocument.getTextAtLine(runtimeMethod.id.position.line - 1);
					for (const token of getTokens(lineAbove)) {
						if (token.isWhiteSpace()) continue;
						if (token.isLineCommentInit()) continue;
						if (token.isLineComment()) {
							let comment = token.value.trim();
							if (!comment.startsWith('@psl-lint.RuntimeStart')) break;
							let args = comment.replace(/^@psl-lint\.RuntimeStart\s+/, '').split('=');
							for (let i = 0; i < args.length; i += 2) {
								let arg = args[i];
								let value = args[i + 1];
								if (arg === 'accept' && value) {
									let strippedValue = value.replace(/"/g, '');
									acceptVariables = strippedValue.split(',');
								}
							}
						}
						else break;
					}
				}
			}
			else if (runtimeMethod.id.value === 'commit') {
				if (!lastStart) continue; // diagnostics.push(new Diagnostic(runtimeMethod.id.getRange(), `Runtime commit without start.`, DiagnosticSeverity.Warning));
				else {
					let startLine = lastStart.id.position.line;
					let commitLine = runtimeMethod.id.position.line;
					let fenceTokens: Token[] = this.scanTokens(pslDocument.parsedDocument.tokens, startLine, commitLine);
					let localVariablesOutsideStart: Member[] = method.declarations.concat(method.parameters).filter(d => d.id.position.line <= startLine && acceptVariables.indexOf(d.id.value) === -1);
					for (const token of fenceTokens) {
						if (token.isString()) {
							for (const stringToken of getTokens(token.value)) {
								let newLine = stringToken.position.line + token.position.line
								let newChar = token.position.character + stringToken.position.character
								stringToken.position = new Position(newLine, newChar);
								this.addVariable(localVariablesOutsideStart, stringToken, lastStart, variables);
							}
						}
						else this.addVariable(localVariablesOutsideStart, token, lastStart, variables);
					}

				}
			}
		}
		if (variables) {
			variables.forEach((tokens, variable) => {
				let text = pslDocument.getTextAtLine(lastStart.id.position.line);
				let startPos = text.length - text.trimLeft().length;
				let word = variable.memberClass === MemberClass.parameter ? 'Parameter' : 'Declaration';
				let diag = new Diagnostic(new Range(lastStart.id.position.line, startPos, lastStart.id.position.line, text.trimRight().length), `${word} "${variable.id.value}" referenced inside Runtime.start but not in variable list.`,this.ruleName, DiagnosticSeverity.Warning, variable);
				diag.relatedInformation = [new DiagnosticRelatedInformation(variable.id.getRange(), `Source of "${variable.id.value}"`)];
				diag.relatedInformation = diag.relatedInformation.concat(tokens.map(t => new DiagnosticRelatedInformation(t.getRange(), `Reference to "${t.value}"`)))
				diag.source = 'tpfence';
				diagnostics.push(diag);
			})
		}

	}
	private addVariable(localVariablesOutsideStart: Member[], token: Token, start: Value, variables: Map<Member, Token[]>) {
		let variable = localVariablesOutsideStart.find(v => v.id.value === token.value);
		if (variable && variable.id !== variable.types[0] && variable.modifiers.map(m => m.value).indexOf('literal') === -1) { // no static and literal
			let varList = start.args[1];
			if (!varList || varList.id.value.split(',').indexOf(variable.id.value) === -1) {
				let tokens = variables.get(variable);
				if (!tokens)
					variables.set(variable, [token]);
				else if (tokens.indexOf(token) === -1)
					variables.set(variable, tokens.concat([token]));
			}
		}
	}

	scanTokens(tokens: Token[], startLine: number, commitLine: number): Token[] {
		let rets = tokens.filter(token => {
			return token.position.line > startLine && token.position.line < commitLine;
		})
		return rets;
	}
}
