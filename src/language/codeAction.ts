import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { MemberDiagnostic } from '../language/codeQuality';

function initializeAction(title: string, ...diagnostics: MemberDiagnostic[]) {
	let action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
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

		let actions: vscode.CodeAction[] = [];
		let allDiagnostics: MemberDiagnostic[] = [];
		let allTextEdits: vscode.TextEdit[] = [];

		let fixAll: vscode.CodeAction = initializeAction('Fix all.');


		for (const diagnostic of context.diagnostics) {
			if (!diagnostic.member) continue;

			let method = diagnostic.member as parser.Method;

			if (diagnostic.message.startsWith('Separator')) {
				let separatorAction = initializeAction('Add separator.', diagnostic);

				let textEdit = vscode.TextEdit.insert(new vscode.Position(method.prevLine, 0), '\t// --------------------------------------------------------------------')

				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit)
			}
			if (diagnostic.message.startsWith('Documentation')) {
				let documentationAction = initializeAction('Add documentation block.', diagnostic);

				let docText = `\t/* DOC ----------------------------------------------------------------\n\tTODO: description of label ${method.id.value}\n\n`;
				let terminator = `\t** ENDDOC */\n`;
				if (method.parameters.length > 0) {
					let spacing = method.parameters.slice().sort((p1, p2): number => {
						return p2.id.value.length - p1.id.value.length;
					})[0].id.value.length + 2;

					docText += method.parameters.map(p => `\t@param ${p.id.value}${' '.repeat(spacing - p.id.value.length)}TODO: description of param ${p.id.value}`).join('\n\n') + '\n';
				}
				docText += terminator;

				let textEdit = vscode.TextEdit.insert(new vscode.Position(method.nextLine, 0), docText);
				documentationAction.edit.set(document.uri, [textEdit]);
				actions.push(documentationAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit)

			}

			if (diagnostic.ruleName == "TwoEmptyLines") {
				let separatorAction = initializeAction('Add two empty lines above method.', diagnostic);
				let fixText = ""
				if (diagnostic.addOneLine) fixText = `\n`;
				if (diagnostic.addTwoLines) fixText = `\n\n`
				let textEdit = vscode.TextEdit.insert(new vscode.Position(method.prevLine, 0), fixText);
				separatorAction.edit.set(document.uri, [textEdit]);
				actions.push(separatorAction);

				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit)
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
