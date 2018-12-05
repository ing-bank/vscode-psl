import * as vscode from 'vscode';
import { MemberDiagnostic } from '../language/codeQuality';
import * as parser from '../parser/parser';
import { getLineAfter } from '../parser/utilities';
import { Code, MethodDocumentation, MethodSeparator, TwoEmptyLines } from '../pslLint/methodDoc';

function initializeAction(title: string, ...diagnostics: MemberDiagnostic[]) {
	const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
	action.edit = new vscode.WorkspaceEdit();
	if (diagnostics) action.diagnostics = diagnostics;
	return action;
}

interface CodeQualityActionContext {
	diagnostics: MemberDiagnostic[];
}

export class PSLActionProvider implements vscode.CodeActionProvider {
	public async provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range,
		context: CodeQualityActionContext,
	): Promise<vscode.CodeAction[]> {

		if (context.diagnostics.length === 0) return;

		const newLine = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
		const actions: vscode.CodeAction[] = [];
		const allDiagnostics: MemberDiagnostic[] = [];
		const allTextEdits: Array<{ edit: vscode.TextEdit, priority: number }> = [];

		const fixAll: vscode.CodeAction = initializeAction('Fix all.');

		for (const diagnostic of context.diagnostics) {
			if (!diagnostic.member) continue;

			const method = diagnostic.member as parser.Method;

			if (diagnostic.ruleName === MethodSeparator.name) {
				const separatorAction = initializeAction('Add separator.', diagnostic);

				const textEdit = vscode.TextEdit.insert(
					new vscode.Position(method.id.position.line - 1, Number.MAX_VALUE),
					`${newLine}\t// --------------------------------------------------------------------`,
				);

				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push({ edit: textEdit, priority: 2 });
			}

			if (diagnostic.ruleName === MethodDocumentation.name) {
				const documentationAction = initializeAction('Add documentation block.', diagnostic);

				let docText = `\t/* DOC ----------------------------------------------------------------${newLine}\t`
					+ `TODO: description of label ${method.id.value}${newLine}${newLine}`;
				const terminator = `\t** ENDDOC */${newLine}`;
				if (method.parameters.length > 0) {
					const spacing = method.parameters.slice().sort((p1, p2): number => {
						return p2.id.value.length - p1.id.value.length;
					})[0].id.value.length + 2;

					docText += method.parameters.map(p => {
						return `\t@param ${p.id.value}${' '.repeat(spacing - p.id.value.length)}TODO: description of param ${p.id.value}`;
					}).join(`${newLine}${newLine}`) + `${newLine}`;
				}
				docText += terminator;

				const textEdit = vscode.TextEdit.insert(new vscode.Position(getLineAfter(method), 0), docText);
				documentationAction.edit.set(document.uri, [textEdit]);
				actions.push(documentationAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push({ edit: textEdit, priority: 2 });

			}

			if (diagnostic.ruleName === TwoEmptyLines.name) {

				if (!diagnostic.code) return;

				const separatorAction = initializeAction('Add two empty lines above method.', diagnostic);
				let fixText = '';

				if (diagnostic.code === Code.ONE_EMPTY_LINE) fixText = `${newLine}`;
				if (diagnostic.code === Code.TWO_EMPTY_LINES) fixText = `${newLine}${newLine}`;

				const textEdit = vscode.TextEdit.insert(
					new vscode.Position(method.id.position.line - 1, Number.MAX_VALUE),
					fixText,
				);

				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push({ edit: textEdit, priority: 1 });
			}
		}
		if (actions.length > 1) {
			fixAll.edit.set(document.uri, allTextEdits.sort((a, b) => a.priority - b.priority).map(edits => edits.edit));
			fixAll.diagnostics = allDiagnostics;
			actions.push(fixAll);
		}
		return actions;
	}
}
