import * as vscode from 'vscode';
import * as format from './pslFormat';
import * as parser from '../parser/parser';
import {getDiagnostics} from './pslLint/main';
import { Diagnostic } from './pslLint/api';

export async function activate(context: vscode.ExtensionContext) {
    
    // Format Document
	format.activate(context);
	
	// lint rules
    let lintDiagnostics = vscode.languages.createDiagnosticCollection('psl-lint');
	context.subscriptions.push(lintDiagnostics);
	if (vscode.window.activeTextEditor) {
		prepareRules(vscode.window.activeTextEditor.document, lintDiagnostics)
	}
	vscode.workspace.onDidOpenTextDocument((textDocument) => prepareRules(textDocument, lintDiagnostics))
	vscode.workspace.onDidChangeTextDocument((e) => prepareRules(e.document, lintDiagnostics))
}


function prepareRules(textDocument: vscode.TextDocument, formatDiagnostics: vscode.DiagnosticCollection) {
	let p = new parser.Parser();
	let documentText = textDocument.getText();
	p.parseDocument(documentText);
	
	let diagnostics = getDiagnostics(p, documentText);
	let vscodeDiagnostics = transform(diagnostics);

	formatDiagnostics.set(vscode.Uri.file(textDocument.fileName), vscodeDiagnostics);
	vscode.workspace.onDidCloseTextDocument(textDocument => formatDiagnostics.delete(textDocument.uri));
}

function transform(diagnostics: Diagnostic[]): vscode.Diagnostic[] {
	return diagnostics.map(d => {
		let r = d.range;
		let vscodeRange = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
		let vscodeDiagnostic = new vscode.Diagnostic(vscodeRange, d.message, d.severity);
		vscodeDiagnostic.source = d.source;
		vscodeDiagnostic.code = d.code;
		return vscodeDiagnostic;
	})
}


