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
}


function prepareRules(textDocument: vscode.TextDocument, lintDiagnostics: vscode.DiagnosticCollection, cancellationToken: vscode.CancellationToken) {
	if (!isPSL(textDocument)) return;
	let lint: boolean = vscode.workspace.getConfiguration('psl', textDocument.uri).get('lint');
	if (!lint) return;
	process.nextTick(() => {
		if (!cancellationToken.isCancellationRequested) {
			let documentText = textDocument.getText();
			let parsedDocument: api.Document = prepareDocument(documentText, textDocument);
			let diagnostics = getDiagnostics(parsedDocument, documentText);
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
	let returnDoc = new api.Document(parsedDocument);
	returnDoc.getTextAtLine = (getTextAtLine);
	return returnDoc;
}

function transform(diagnostics: api.Diagnostic[]): vscode.Diagnostic[] {
	return diagnostics.map(d => {
		let r = d.range;
		let vscodeRange = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
		let vscodeDiagnostic = new vscode.Diagnostic(vscodeRange, d.message, d.severity);
		vscodeDiagnostic.source = d.source;
		vscodeDiagnostic.code = d.code;
		return vscodeDiagnostic;
	})
}

function isPSL(textDocument: vscode.TextDocument) {
	return vscode.languages.match(PSL_MODE, textDocument) || vscode.languages.match(BATCH_MODE, textDocument) || vscode.languages.match(TRIG_MODE, textDocument);
}