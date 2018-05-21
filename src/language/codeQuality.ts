import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { getDiagnostics } from '../pslLint/activate';
import * as api from '../pslLint/api';
import { PSL_MODE, BATCH_MODE, TRIG_MODE } from '../extension';

export async function activate(context: vscode.ExtensionContext) {

	let lintDiagnostics = vscode.languages.createDiagnosticCollection('psl-lint');
	context.subscriptions.push(lintDiagnostics);

	// initial token
	let tokenSource = new vscode.CancellationTokenSource();

	if (vscode.window.activeTextEditor) {
		prepareRules(vscode.window.activeTextEditor.document, lintDiagnostics, tokenSource.token)
	}

	vscode.window.onDidChangeActiveTextEditor(e => {
		if (!e) return;
		prepareRules(e.document, lintDiagnostics, tokenSource.token)
	})

	vscode.workspace.onDidChangeTextDocument(e => {
		if (!e) return;
		tokenSource.cancel();
		tokenSource = new vscode.CancellationTokenSource();
		prepareRules(e.document, lintDiagnostics, tokenSource.token)
	})

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			PSL_MODE, new PSLActionProvider(),
		)
	)
}

function initializeAction(title: string, ...diagnostics: MemberDiagnostic[]) {
	let action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
	action.edit = new vscode.WorkspaceEdit();
	if (diagnostics) action.diagnostics = diagnostics;
	return action;
}


class PSLActionProvider implements vscode.CodeActionProvider {
	public async provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: CodeQualityActionContext): Promise<vscode.CodeAction[]> {

		if (context.diagnostics.length === 0) return;

		let actions: vscode.CodeAction[] = [];
		let allDiagnostics: MemberDiagnostic[] = [];
		let allTextEdits: vscode.TextEdit[] = [];
		
		let fixAll: vscode.CodeAction = initializeAction('Fix all.');

		
		for (const diagnostic of context.diagnostics) {
			if (!diagnostic.member) continue;
			
			let method = diagnostic.member as parser.Method;
			
			if (diagnostic.message.startsWith('Seperator')) {				
				let seperatorAction = initializeAction('Add sepeartor.', diagnostic);

				let textEdit = vscode.TextEdit.insert(new vscode.Position(method.prevLine, 0), '\t// --------------------------------------------------------------------')
				
				seperatorAction.edit.set(document.uri, [textEdit]);
				actions.push(seperatorAction);
				
				allDiagnostics.push(diagnostic);
				allTextEdits.push(textEdit)
			}
			if (diagnostic.message.startsWith('Documentation')) {
				let documentationAction = initializeAction('Add documentation block.', diagnostic);

				let docText = `\t/* DOC ----------------------------------------------------------------\n\tTODO: description of label ${method.id.value}\n\n`;
				let terminator = `\t** ENDDOC */\n`;
				if (method.parameters.length > 0) {
					let spacing = method.parameters.sort((p1, p2): number => {
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
		}
		if (actions.length > 1) {
			fixAll.edit.set(document.uri, allTextEdits);
			fixAll.diagnostics = allDiagnostics;
			actions.push(fixAll);
		}
		return actions;
	}
}

interface CodeQualityActionContext {

	diagnostics: MemberDiagnostic[];

	only?: vscode.CodeActionKind;
}

class MemberDiagnostic extends vscode.Diagnostic {
	member: parser.Member;

}

function prepareRules(textDocument: vscode.TextDocument, lintDiagnostics: vscode.DiagnosticCollection, cancellationToken: vscode.CancellationToken) {
	if (!isPSL(textDocument)) return;
	let lint: boolean = vscode.workspace.getConfiguration('psl', textDocument.uri).get('lint');
	if (!lint) return;
	process.nextTick(() => {
		if (!cancellationToken.isCancellationRequested) {
			let documentText = textDocument.getText();
			let pslDocument: api.PslDocument = prepareDocument(documentText, textDocument);
			let diagnostics = getDiagnostics(pslDocument);
			let vscodeDiagnostics = transform(diagnostics);
			process.nextTick(() => {
				if (!cancellationToken.isCancellationRequested) {
					lintDiagnostics.set(vscode.Uri.file(textDocument.fileName), vscodeDiagnostics);
					vscode.workspace.onDidCloseTextDocument(textDocument => lintDiagnostics.delete(textDocument.uri));
				}
			})
		}
	})
}

function prepareDocument(documentText: string, textDocument: vscode.TextDocument) {
	let parsedDocument = parser.parseText(documentText);
	let getTextAtLine = (n: number) => textDocument.lineAt(n).text;
	let pslDocument = new api.PslDocument(parsedDocument, documentText, textDocument.uri.fsPath, getTextAtLine);
	return pslDocument;
}

function transform(diagnostics: api.Diagnostic[]): vscode.Diagnostic[] {
	return diagnostics.map(d => {
		let r = d.range;
		let vscodeRange = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
		let vscodeDiagnostic = new MemberDiagnostic(vscodeRange, d.message, d.severity);
		vscodeDiagnostic.source = d.source;
		vscodeDiagnostic.code = d.code;
		if (d.member) vscodeDiagnostic.member = d.member;
		return vscodeDiagnostic;
	})
}

function isPSL(textDocument: vscode.TextDocument) {
	return vscode.languages.match(PSL_MODE, textDocument) || vscode.languages.match(BATCH_MODE, textDocument) || vscode.languages.match(TRIG_MODE, textDocument);
}