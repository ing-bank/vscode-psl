import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { getDiagnostics } from '../pslLint/activate';
import * as api from '../pslLint/api';
import { PSL_MODE, BATCH_MODE, TRIG_MODE } from '../extension';
import { setConfig, removeConfig } from '../pslLint/config';
import { PSLActionProvider } from '../hostCommands/codeAction';

type lintOption = "none" | "all" | "config" | true;

export async function activate(context: vscode.ExtensionContext) {

	await pslLintConfigurationWatchers(context);

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

async function pslLintConfigurationWatchers(context: vscode.ExtensionContext) {
	return Promise.all(vscode.workspace.workspaceFolders.map(workspace => new vscode.RelativePattern(workspace, 'psl-lint.json')).map(async (pattern) => {
		let watcher = vscode.workspace.createFileSystemWatcher(pattern);
		context.subscriptions.push(watcher.onDidChange(uri => {
			setConfig(uri.fsPath);
		}), watcher.onDidCreate(uri => {
			setConfig(uri.fsPath);
		}));
		watcher.onDidDelete(uri => {
			removeConfig(uri.fsPath);
		});
		let uris = await vscode.workspace.findFiles(pattern);
		if (!uris.length) return;
		await setConfig(uris[0].fsPath);
	}));
}

export class MemberDiagnostic extends vscode.Diagnostic {
	member: parser.Member;
}

function prepareRules(textDocument: vscode.TextDocument, lintDiagnostics: vscode.DiagnosticCollection, cancellationToken: vscode.CancellationToken) {
	if (!isPSL(textDocument)) return;

	const lintConfigValue: lintOption = vscode.workspace.getConfiguration('psl', textDocument.uri).get('lint');

	let useConfig = false;
	if (lintConfigValue === 'config') {
		useConfig = true;
	}
	else if (lintConfigValue !== 'all' && lintConfigValue !== true) {
		lintDiagnostics.clear();
		return;
	}

	process.nextTick(() => {
		if (!cancellationToken.isCancellationRequested) {
			lint(textDocument, useConfig, cancellationToken, lintDiagnostics);
		}
	})
}

function lint(textDocument: vscode.TextDocument, useConfig: boolean, cancellationToken: vscode.CancellationToken, lintDiagnostics: vscode.DiagnosticCollection) {
	let documentText = textDocument.getText();
	let pslDocument: api.PslDocument = prepareDocument(documentText, textDocument);
	let diagnostics = getDiagnostics(pslDocument, useConfig);
	let vscodeDiagnostics = transform(diagnostics, textDocument.uri);
	process.nextTick(() => {
		if (!cancellationToken.isCancellationRequested) {
			lintDiagnostics.set(vscode.Uri.file(textDocument.fileName), vscodeDiagnostics);
			vscode.workspace.onDidCloseTextDocument(textDocument => lintDiagnostics.delete(textDocument.uri));
		}
	});
}

function prepareDocument(documentText: string, textDocument: vscode.TextDocument) {
	let parsedDocument = parser.parseText(documentText);
	let getTextAtLine = (n: number) => textDocument.lineAt(n).text;
	let pslDocument = new api.PslDocument(parsedDocument, documentText, textDocument.uri.fsPath, getTextAtLine);
	return pslDocument;
}

function transform(diagnostics: api.Diagnostic[], uri: vscode.Uri): vscode.Diagnostic[] {
	return diagnostics.map(d => {
		let r = d.range;
		let vscodeRange = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
		let vscodeDiagnostic = new MemberDiagnostic(vscodeRange, d.message, d.severity);
		vscodeDiagnostic.source = d.source;
		vscodeDiagnostic.code = d.code;
		if (d.member) vscodeDiagnostic.member = d.member;
		if (d.relatedInformation) vscodeDiagnostic.relatedInformation = d.relatedInformation.map(x => {
			return new vscode.DiagnosticRelatedInformation(
				new vscode.Location(uri, new vscode.Range(x.range.start.line, x.range.start.character, x.range.end.line, x.range.end.character)),
				x.message
			)
		});
		return vscodeDiagnostic;
	})
}

function isPSL(textDocument: vscode.TextDocument) {
	return vscode.languages.match(PSL_MODE, textDocument) || vscode.languages.match(BATCH_MODE, textDocument) || vscode.languages.match(TRIG_MODE, textDocument);
}
