import * as vscode from 'vscode';
import { PSL_MODE } from '../extension';
import * as parser from '../parser/parser';
import { getDiagnostics } from '../pslLint/activate';
import * as api from '../pslLint/api';
import { getConfig, removeConfig, setConfig } from '../pslLint/config';
import { PSLActionProvider } from './codeAction';

type lintOption = 'none' | 'all' | 'config' | true;

export async function activate(context: vscode.ExtensionContext) {

	await pslLintConfigurationWatchers(context);

	const lintDiagnostics = vscode.languages.createDiagnosticCollection('psl-lint');
	context.subscriptions.push(lintDiagnostics);

	// initial token
	let tokenSource = new vscode.CancellationTokenSource();

	if (vscode.window.activeTextEditor) {
		prepareRules(vscode.window.activeTextEditor.document, lintDiagnostics, tokenSource.token);
	}

	vscode.window.onDidChangeActiveTextEditor(e => {
		if (!e) return;
		prepareRules(e.document, lintDiagnostics, tokenSource.token);
	});

	vscode.workspace.onDidChangeTextDocument(e => {
		if (!e) return;
		tokenSource.cancel();
		tokenSource = new vscode.CancellationTokenSource();
		prepareRules(e.document, lintDiagnostics, tokenSource.token);
	});

	vscode.workspace.onDidCloseTextDocument(closedDocument => {
		lintDiagnostics.delete(closedDocument.uri);
	});

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			PSL_MODE, new PSLActionProvider(),
		),
	);
}

async function pslLintConfigurationWatchers(context: vscode.ExtensionContext) {
	return Promise.all(
		vscode.workspace.workspaceFolders
			.map(workspace => new vscode.RelativePattern(workspace, 'psl-lint.json'))
			.map(async pattern => {
				const watcher = vscode.workspace.createFileSystemWatcher(pattern);
				context.subscriptions.push(watcher.onDidChange(uri => {
					setConfig(uri.fsPath);
				}), watcher.onDidCreate(uri => {
					setConfig(uri.fsPath);
				}));
				watcher.onDidDelete(uri => {
					removeConfig(uri.fsPath);
				});
				const uris = await vscode.workspace.findFiles(pattern);
				if (!uris.length) return;
				await setConfig(uris[0].fsPath);
			}),
	);
}

export class MemberDiagnostic extends vscode.Diagnostic {
	member: parser.Member;
	ruleName: string;
}

function prepareRules(
	textDocument: vscode.TextDocument,
	lintDiagnostics: vscode.DiagnosticCollection,
	cancellationToken: vscode.CancellationToken,
) {
	if (!api.ProfileComponent.isProfileComponent(textDocument.fileName)) return;

	const lintConfigValue: lintOption = vscode.workspace.getConfiguration('psl', textDocument.uri).get('lint');

	let useConfig = false;
	if (lintConfigValue === 'config') {
		// check if config exist first
		const config = getConfig(textDocument.uri.fsPath);
		if (!config) return;
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
	});
}

function lint(
	textDocument: vscode.TextDocument,
	useConfig: boolean, cancellationToken: vscode.CancellationToken,
	lintDiagnostics: vscode.DiagnosticCollection,
) {
	const profileComponent: api.ProfileComponent = prepareDocument(textDocument);
	const parsedDocument = api.ProfileComponent.isPsl(profileComponent.fsPath) ?
		parser.parseText(textDocument.getText()) : undefined;
	const diagnostics = getDiagnostics(profileComponent, parsedDocument, useConfig);
	const memberDiagnostics = transform(diagnostics, textDocument.uri);
	process.nextTick(() => {
		if (!cancellationToken.isCancellationRequested) {
			lintDiagnostics.set(textDocument.uri, memberDiagnostics);
		}
	});
}

function prepareDocument(textDocument: vscode.TextDocument) {
	const getTextAtLine = (n: number) => textDocument.lineAt(n).text;
	const profileComponent = new api.ProfileComponent(textDocument.uri.fsPath, textDocument.getText(), getTextAtLine);
	return profileComponent;
}

function transform(diagnostics: api.Diagnostic[], uri: vscode.Uri): MemberDiagnostic[] {
	return diagnostics.map(pslLintDiagnostic => {
		const r = pslLintDiagnostic.range;
		const vscodeRange = new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
		const memberDiagnostic = new MemberDiagnostic(vscodeRange, pslLintDiagnostic.message, pslLintDiagnostic.severity);
		memberDiagnostic.source = pslLintDiagnostic.source;
		memberDiagnostic.code = pslLintDiagnostic.code;
		memberDiagnostic.ruleName = pslLintDiagnostic.ruleName;
		if (pslLintDiagnostic.member) memberDiagnostic.member = pslLintDiagnostic.member;
		if (pslLintDiagnostic.relatedInformation) {
			memberDiagnostic.relatedInformation = pslLintDiagnostic.relatedInformation.map(x => {
				return new vscode.DiagnosticRelatedInformation(
					new vscode.Location(uri,
						new vscode.Range(x.range.start.line,
							x.range.start.character,
							x.range.end.line,
							x.range.end.character,
						)),
					x.message,
				);
			});
		}
		return memberDiagnostic;
	});
}
