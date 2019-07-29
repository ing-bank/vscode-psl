import * as fs from 'fs-extra';
import * as vscode from 'vscode';
export { extensionToDescription } from '../mtm/utils';
import * as environment from '../common/environment';
import { MtmConnection } from '../mtm/mtm';

const outputChannel = vscode.window.createOutputChannel('Profile Host');

export const logger = {
	error: (message: string) => {
		outputChannel.show(true);
		outputChannel.appendLine(`[ERR!][${new Date().toTimeString().split(' ')[0]}]    ${message.trim()}\n`);
	},
	info: (message: string, hide?: boolean) => {
		if (!hide) outputChannel.show(true);
		outputChannel.appendLine(`[INFO][${new Date().toTimeString().split(' ')[0]}]    ${message.trim()}\n`);
	},

};

export const enum icons {
	ERROR = '❌',
	GET = '⇩',
	LINK = '🔗',
	REFRESH = '🔃',
	RUN = '▶',
	SEND = '⇧',
	SUCCESS = '✔',
	TEST = '⚙',
	WAIT = '…',
	WARN = '⚠',
}

export const enum ContextMode {
	FILE = 1,
	DIRECTORY = 2,
	EMPTY = 3,
}

const enum NEWLINE_SETTING {
	ALWAYS = 'always',
	NEVER = 'never',
}

export interface ExtensionCommandContext {
	fsPath: string;
	dialog: boolean;
}

export interface HostCommandContext {
	fsPath: string;
	mode: ContextMode;
}

export function getFullContext(context: ExtensionCommandContext | undefined): HostCommandContext {
	let fsPath: string = '';
	let mode: ContextMode;
	const activeTextEditor = vscode.window.activeTextEditor;
	if (context && context.dialog) {
		mode = ContextMode.EMPTY;
		return { fsPath, mode };
	}
	if ((!context || !context.fsPath) && activeTextEditor) {
		fsPath = activeTextEditor.document.fileName;
		mode = ContextMode.FILE;
		return { fsPath, mode };
	}
	else if (!context) {
		mode = ContextMode.EMPTY;
		return { fsPath, mode };
	}
	else {
		fsPath = context.fsPath;
		mode = fs.lstatSync(fsPath).isFile() ? ContextMode.FILE : ContextMode.DIRECTORY;
		return { fsPath, mode };
	}
}

export async function executeWithProgress(message: string, task: () => Promise<any>) {
	return vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: message }, async () => {
		await task();
		return;
	});
}

export async function getConnection(env: environment.EnvironmentConfig): Promise<MtmConnection> {
	const connection = new MtmConnection(env.serverType, env.encoding);
	await connection.open(env.host, env.port, env.user, env.password);
	return connection;
}

export async function getEnvironment(fsPath: string): Promise<environment.EnvironmentConfig[]> {
	const workspaceFile = new environment.WorkspaceFile(fsPath);
	try {
		const envs = await workspaceFile.environmentObjects;
		envs.forEach(env => {
			if (!env.host || !env.port || !env.user || !env.password) {
				throw new Error();
			}
		});
		return envs;
	}
	catch (e) {
		const workspaceFolder = workspaceFile.workspaceFolder;
		if (workspaceFolder) {
			throw new Error(`Invalid configuration for Workspace Folder ${workspaceFolder.name}`);
		}
		throw new Error(`File ${fsPath} is not a member of the Workspace.`);
	}
}

export async function getCommandenvConfigQuickPick(envs: environment.EnvironmentConfig[]): Promise<environment.EnvironmentConfig | undefined> {
	const items: environment.LaunchQuickPick[] = envs.map(env => {
		return { label: env.name, description: '', env };
	});
	if (items.length === 1) return items[0].env;
	const choice = await vscode.window.showQuickPick(items, { placeHolder: 'Select environment to get from.' });
	if (!choice) return undefined;
	return choice.env;
}

export function writeFileWithSettings(fsPath: string, output: string): Promise<void> {
	const trailingNewline: NEWLINE_SETTING = vscode.workspace.getConfiguration('psl', null).get('trailingNewline');
	switch (trailingNewline) {
		case NEWLINE_SETTING.ALWAYS:
			if (!output.endsWith('\n')) output += detectNewline(output);
			break;
		case NEWLINE_SETTING.NEVER:
			output = output.replace(/(\r?\n)+$/, '');
			break;
		default:
			break;
	}
	return fs.writeFile(fsPath, output);
}

/**
 * https://github.com/sindresorhus/detect-newline
 */
function detectNewline(output: string) {
	const newlines = (output.match(/(?:\r?\n)/g) || []);

	if (newlines.length === 0) {
		return '\n';
	}

	const crlfCount = newlines.filter(el => {
		return el === '\r\n';
	}).length;

	const lfCount = newlines.length - crlfCount;

	return crlfCount > lfCount ? '\r\n' : '\n';
}
