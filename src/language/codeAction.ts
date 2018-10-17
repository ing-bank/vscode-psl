import * as vscode from 'vscode';
import { MemberDiagnostic } from '../language/codeQuality';
import * as parser from '../parser/parser';
import { getLineAfter } from '../parser/utillities';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from '../pslLint/methodDoc';

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
	public async provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: CodeQualityActionContext): Promise<vscode.CodeAction[]> {

		if (context.diagnostics.length === 0) return;

		const actions: vscode.CodeAction[] = [];
		const allDiagnostics: MemberDiagnostic[] = [];
		const allTextEdits: vscode.TextEdit[] = [];

		const fixAll: vscode.CodeAction = initializeAction('Fix all.');

		for (const diagnostic of context.diagnostics) {
			if (!diagnostic.member) continue;

			const method = diagnostic.member as parser.Method;

			if (diagnostic.ruleName === MethodSeparator.name) {
				const separatorAction = initializeAction('Add separator.', diagnostic);

				const textEdit = vscode.TextEdit.insert(new vscode.Position(method.id.position.character - 1, 0), '\t// --------------------------------------------------------------------');

				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit);
			}

			if (diagnostic.ruleName === MethodDocumentation.name) {
				const documentationAction = initializeAction('Add documentation block.', diagnostic);

				let docText = `\t/* DOC ----------------------------------------------------------------\n\tTODO: description of label ${method.id.value}\n\n`;
				const terminator = `\t** ENDDOC */\n`;
				if (method.parameters.length > 0) {
					const spacing = method.parameters.slice().sort((p1, p2): number => {
						return p2.id.value.length - p1.id.value.length;
					})[0].id.value.length + 2;

					docText += method.parameters.map(p => `\t@param ${p.id.value}${' '.repeat(spacing - p.id.value.length)}TODO: description of param ${p.id.value}`).join('\n\n') + '\n';
				}
				docText += terminator;

				const textEdit = vscode.TextEdit.insert(new vscode.Position(getLineAfter(method), 0), docText);
				documentationAction.edit.set(document.uri, [textEdit]);
				actions.push(documentationAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit);

			}

			if (diagnostic.ruleName === TwoEmptyLines.name) {

				if ((diagnostic.addOneLine === false) && (diagnostic.addTwoLines === false)) return;

				const separatorAction = initializeAction('Add two empty lines above method.', diagnostic);
				let fixText = '';

				if (diagnostic.addOneLine) fixText = `\n`;
				if (diagnostic.addTwoLines) fixText = `\n\n`;

				const textEdit = vscode.TextEdit.insert(new vscode.Position(method.id.position.line - 1, 0), fixText);

				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit);
			}
		}
		if (actions.length > 1) {
			fixAll.edit.set(document.uri, allTextEdits);
			fixAll.diagnostics = allDiagnostics;
			actions.push(fixAll);
		}
		return actions;
	}
}
