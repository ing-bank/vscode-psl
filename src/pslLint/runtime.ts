import {
	BinaryOperator, Identifier,
	StringLiteral, SyntaxKind, Value,
} from '../parser/statementParser';
import {
	Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity,
	Member, MemberClass, Method, MethodRule, PslDocument, Range, Token,
} from './api';

export class RuntimeStart implements MethodRule {
	ruleName = RuntimeStart.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {

		const runtimeCalls: BinaryOperator[] = [];

		method.statements.filter(statement => {
			return statement.action.value === 'do';
		}).forEach(statement => {
			statement.expressions.forEach(expression => {
				const dotOperator = expression as BinaryOperator;
				const classIdentifier = this.getClass(dotOperator);
				if (!classIdentifier) return;
				if (classIdentifier.id.value === 'Runtime') runtimeCalls.push(dotOperator);
			});
		});

		if (!runtimeCalls.length) return [];

		const diagnostics: Diagnostic[] = [];
		this.tpFence(diagnostics, runtimeCalls, pslDocument, method);
		return diagnostics;
	}

	getClass(dotOperator: BinaryOperator): Identifier | undefined {
		if (dotOperator.kind !== SyntaxKind.BINARY_OPERATOR) return;
		if (Array.isArray(dotOperator.left)) return;
		if (!dotOperator.left || dotOperator.left.kind === SyntaxKind.BINARY_OPERATOR) return;
		return dotOperator.left as Identifier;
	}

	getMethod(dotOperator: BinaryOperator): Identifier | undefined {
		if (dotOperator.kind !== SyntaxKind.BINARY_OPERATOR) return;
		return dotOperator.right as Identifier;
	}

	tpFence(diagnostics: Diagnostic[], runtimeCalls: BinaryOperator[], pslDocument: PslDocument, method: Method) {
		let lastStart: Value;
		let variables: Map<Member, Token[]>;
		let acceptVariables: string[] = [];
		for (const runtimeCall of runtimeCalls) {
			const runtimeMethod = this.getMethod(runtimeCall);
			if (runtimeMethod.id.value === 'start') {
				if (lastStart) {
					variables.forEach((identifiers, variable) => {
						this.createDiagnostic(lastStart, variable, identifiers, diagnostics);
					});
				}
				lastStart = runtimeMethod;
				variables = new Map();
				acceptVariables = this.addToWhitelist(pslDocument, runtimeMethod);
			}
			else if (runtimeMethod.id.value === 'commit') {
				if (!lastStart) continue;
				else {
					const startLine = lastStart.id.position.line;
					const commitLine = runtimeMethod.id.position.line;
					const identifierTokens: Token[] = this.getAllIdentifersInRange(
						pslDocument.parsedDocument.tokens,
						startLine,
						commitLine,
					);
					const variablesOutsideStart: Member[] = method.declarations.concat(method.parameters)
						.filter(variable => {
							return variable.id.position.line <= startLine && acceptVariables.indexOf(variable.id.value) === -1;
						});
					for (const token of identifierTokens) {
						this.addVariable(variablesOutsideStart, token, lastStart, variables);
					}

				}
			}
		}
		if (variables) {
			variables.forEach((identifiers, variable) => {
				this.createDiagnostic(lastStart, variable, identifiers, diagnostics);
			});
		}

	}
	private getAllIdentifersInRange(tokens: Token[], startLine: number, commitLine: number): Token[] {
		return tokens.filter(token => {
			return token.position.line > startLine && token.position.line < commitLine;
		});
	}

	private createDiagnostic(lastStart: Value, variable: Member, identifiers: Token[], diagnostics: Diagnostic[]) {
		const range = this.getDiagnosticRange(lastStart);
		const word = variable.memberClass === MemberClass.parameter ? 'Parameter' : 'Declaration';
		const diag = new Diagnostic(
			range,
			`${word} "${variable.id.value}" referenced inside Runtime.start but not in variable list.`,
			this.ruleName,
			DiagnosticSeverity.Warning,
			variable,
		);
		const relatedSource = new DiagnosticRelatedInformation(
			variable.id.getRange(),
			`Source of "${variable.id.value}"`,
		);
		const relatedReferences = identifiers.map(i => {
			return new DiagnosticRelatedInformation(i.getRange(), `Reference to "${i.value}"`);
		});
		diag.relatedInformation = [
			relatedSource,
			...relatedReferences,
		];
		diag.source = 'tpfence';
		diagnostics.push(diag);
	}

	private addVariable(
		localVariablesOutsideStart: Member[],
		identifierToken: Token,
		start: Identifier,
		variables: Map<Member, Token[]>,
	) {
		const variable = localVariablesOutsideStart.find(v => v.id.value === identifierToken.value);
		if (
			variable
			&& variable.id !== variable.types[0]
			&& variable.modifiers.map(m => m.value).indexOf('literal') === -1
		) { // no static and literal
			const varList = start.args[1] as StringLiteral;
			if (!varList || varList.id.value.split(',').indexOf(variable.id.value) === -1) {
				const tokens = variables.get(variable);
				if (!tokens) {
					variables.set(variable, [identifierToken]);
				}
				else if (tokens.indexOf(identifierToken) === -1) {
					variables.set(variable, tokens.concat([identifierToken]));
				}
			}
		}
	}

	private getDiagnosticRange(start: Identifier): Range {
		const startPos = start.id.position.character - 'do Runtime.'.length;
		const endPos = start.closeParen.position.character + 1;
		return new Range(start.id.position.line, startPos, start.id.position.line, endPos);
	}

	private addToWhitelist(pslDocument: PslDocument, runtimeMethod: Identifier) {
		let acceptVariables = [];
		const commentsAbove: Token[] = pslDocument.getCommentsOnLine(runtimeMethod.id.position.line - 1);
		const whiteListComment = commentsAbove[0];
		if (!whiteListComment || !whiteListComment.isLineComment()) return [];

		const comment = whiteListComment.value.trim();
		if (!comment.startsWith('@psl-lint.RuntimeStart')) return [];

		const args = comment.replace(/^@psl-lint\.RuntimeStart\s+/, '').split('=');
		for (let i = 0; i < args.length; i += 2) {
			const arg = args[i];
			const value = args[i + 1];
			if (arg === 'accept' && value) {
				const strippedValue = value.replace(/"/g, '');
				acceptVariables = strippedValue.split(',');
			}
		}

		return acceptVariables;
	}
}
