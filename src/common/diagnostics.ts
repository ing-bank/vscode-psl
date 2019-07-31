import * as vscode from 'vscode';

export class PSLDiagnostic {

	static diagnosticCollections: vscode.DiagnosticCollection[] = [];

	static setDiagnostics(pslDiagnostics: PSLDiagnostic[], envName: string, fsPath: string) {
		let diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
		pslDiagnostics.forEach(pslDiagnostic => {
			let canonicalFile = vscode.Uri.file(pslDiagnostic.file).toString();
			let diagnostics = diagnosticMap.get(canonicalFile);
			pslDiagnostic.diagnostic.source = envName;
			if (!diagnostics) { diagnostics = []; }

			diagnostics.push(pslDiagnostic.diagnostic);
			diagnosticMap.set(canonicalFile, diagnostics);
		});
		let collection = this.diagnosticCollections.find(col => col.name === envName);
		if (!collection)  {
			collection = this.registerCollection(envName);
		}
		let uri = vscode.Uri.file(fsPath);
		collection.delete(uri);
		diagnosticMap.forEach((diags, file) => {
			collection.set(vscode.Uri.parse(file), diags);

		});
	}

	static registerCollection(envName: string): vscode.DiagnosticCollection {
		let collection = vscode.languages.createDiagnosticCollection(envName);
		vscode.workspace.onDidCloseTextDocument((textDocument) => {
			let uri = textDocument.uri;
			collection.delete(uri);
		})
		this.diagnosticCollections.push(collection);
		return collection;
	}

	message: string;
	severity: vscode.DiagnosticSeverity;
	file: string;
	range: vscode.Range;

	diagnostic: vscode.Diagnostic;

	constructor(message: string, severity: vscode.DiagnosticSeverity, file: string, range: vscode.Range) {
		this.message = message;
		this.severity = severity;
		this.file = file;
		this.range = range;

		this.diagnostic = new vscode.Diagnostic(this.range, this.message, this.severity);
	}
}
