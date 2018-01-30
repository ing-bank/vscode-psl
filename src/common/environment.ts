import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';
import * as os from 'os';

import * as contextUtils from '../common/context';

const GLOBAL_ENV_PATH = (() => {
	const envFileName = 'environments.json';
	const appdata = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
	let channelPath: string;
	if (vscode.env.appName.indexOf('Insiders') > 0) {
		channelPath = 'Code - Insiders';
	} else {
		channelPath = 'Code';
	}
	let envPath = path.join(appdata, channelPath, 'User', envFileName);
	// in linux, it may not work with /var/local, then try to use /home/myuser/.config
	if ((process.platform === 'linux') && (!fsExtra.existsSync(envPath))) {
		envPath = path.join(os.homedir(), '.config/', channelPath, 'User', envFileName);
	}
	return envPath;
})();

const WORKSPACE_ENV_PATH = path.join('.vscode', 'environment.json');

const configEnv = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 900);
configEnv.command = 'psl.configureEnvironment';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.configureEnvironment', configureEnvironmentHandler
		)
	);


	context.subscriptions.push(configEnv);

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => changeTextEditorHandler(e)));
	changeTextEditorHandler(vscode.window.activeTextEditor)

}

export interface EnvironmentConfig {
	name: string,
	host: string,
	port: number,
	user: string,
	password: string,
	sshLogin: string
}

export async function getEnvironmentObjects(fsPath: string): Promise<EnvironmentConfig[]> {
	let workspaceEnvironments = await readWorkspaceEnvironments(fsPath)
	return getEnvironmentFromGlobalConfig(workspaceEnvironments.names);
}

async function readWorkspaceEnvironments(fsPath: string): Promise<WorkspaceEnvironments> {
	let env = getEnvironmentContext(fsPath);
	let x = await fsExtra.readFile(env.environmentPath);
	let projectEnvironments: WorkspaceEnvironments = jsonc.parse(x.toString());
	if (!projectEnvironments.names) throw new Error('Project environment not properly configured.')
	return projectEnvironments;
}

export async function workspaceQuickPick(): Promise<vscode.QuickPickItem | undefined> {
	try {
		jsonc.parse((await fsExtra.readFile(GLOBAL_ENV_PATH)).toString());
	}
	catch (e) {
		let choice = await vscode.window.showInformationMessage('Environments have not been properly configured.', 'Configure')
		if (!choice) return;
		let defaultConfig: GlobalConfig = {environments: [{name: '', host: '', port: 0, user: '', password: '', sshLogin: ''}]}
		await writeFile(GLOBAL_ENV_PATH, defaultConfig);
		await vscode.window.showTextDocument(vscode.Uri.file(GLOBAL_ENV_PATH));
		return;
	}
	if (!vscode.workspace.workspaceFolders) return;
	let workspaceFolders = vscode.workspace.workspaceFolders;
	let items: vscode.QuickPickItem[] = await Promise.all(workspaceFolders.map(async folder => {
		let name;
		try {
			let envObjects = await getEnvironmentObjects(folder.uri.fsPath);
			if (envObjects.length === 1) {
				name = '\u00a0 \u00a0 $(server) ' + envObjects[0].name
			}
			else if (envObjects.length > 1) {
				name = '\u00a0 \u00a0 $(server) ' + envObjects.map(e => e.name).join(', ')
			}
			else {
				name = 	'\u00a0 \u00a0 Not configured';
			}
		}
		catch (e) {
			name = '\u00a0 \u00a0 Not configured';
		}
		let item: vscode.QuickPickItem = {label: '$(file-directory) ' + folder.name, description: folder.uri.fsPath, detail: name}
		return item;
	}));
	if (items.length === 1) return items[0];
	let configureEnvironments = '\u270E Edit Environments...';
	items.push({label: configureEnvironments, description: ''});
	let choice = await vscode.window.showQuickPick(items, {placeHolder: 'Select a Workspace.'})
	if (choice.label === configureEnvironments) {
		await vscode.window.showTextDocument(vscode.Uri.file(GLOBAL_ENV_PATH));
		return;
	}
	return choice;
}

interface GlobalConfig {
	environments: EnvironmentConfig[]
}

interface WorkspaceEnvironments {
	names: string[]
}

export async function getAllEnvironments() {
	let x = await fsExtra.readFile(GLOBAL_ENV_PATH);
	let globalConfig: GlobalConfig = jsonc.parse(x.toString());
	return globalConfig.environments
}

async function getEnvironmentFromGlobalConfig(nameArray: string[]): Promise<EnvironmentConfig[]> {
	let allEnvs = await getAllEnvironments();
	let ret: EnvironmentConfig[] = []
	for (let name of nameArray) {
		for (let env of allEnvs) {
			if (env.name === name) {
				ret.push(env);
			}
		}
	}
	return ret;
}

interface EnvironmentContext {
	fsPath: string;
	environmentPath: string;
	workspaceFolder: vscode.WorkspaceFolder | undefined;
}

function getEnvironmentContext(fsPath: string): EnvironmentContext {
	if (!fsPath) return {fsPath: '', workspaceFolder: undefined, environmentPath: ''};
	let workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
	let environmentPath: string;
	if (workspaceFolder && fsExtra.existsSync(path.join(workspaceFolder.uri.fsPath, WORKSPACE_ENV_PATH))) {
		environmentPath = path.join(workspaceFolder.uri.fsPath, WORKSPACE_ENV_PATH);
	}
	else environmentPath = '';
	return {fsPath, workspaceFolder, environmentPath};
}

async function configureEnvironmentHandler(context?: contextUtils.ExtensionCommandContext) {
	let workspace = await workspaceQuickPick();
	if (!workspace) return;
	environmentQuickPick(workspace.description);
}

async function environmentQuickPick(fsPath: string) {
	let choice = undefined;
	let environmentContext = getEnvironmentContext(fsPath);
	let workspaceEnvironments;
	let globalConfig: GlobalConfig;
	try {
		globalConfig = jsonc.parse((await fsExtra.readFile(GLOBAL_ENV_PATH)).toString());
		if (!globalConfig.environments) throw new Error();
	}
	catch (e) {
		let choice = await vscode.window.showWarningMessage('Environments have not been properly configured.', 'Configure')
		if (!choice) return;
		let defaultConfig: GlobalConfig = {environments: [{name: '', host: '', port: 0, user: '', password: '', sshLogin: ''}]}
		await writeFile(GLOBAL_ENV_PATH, defaultConfig);
		await vscode.window.showTextDocument(vscode.Uri.file(GLOBAL_ENV_PATH));
		return;
	}
	try {
		workspaceEnvironments = await readWorkspaceEnvironments(fsPath);
	}
	catch (e) {
		let envPath;
		if (!environmentContext.environmentPath) {
			envPath = path.join(environmentContext.workspaceFolder.uri.fsPath, WORKSPACE_ENV_PATH)
		}
		else {
			envPath = environmentContext.environmentPath;
		}
		await writeFile(envPath, {'names': []})
		workspaceEnvironments = await readWorkspaceEnvironments(fsPath);
	}
	let names = workspaceEnvironments.names
	do {
		let items: vscode.QuickPickItem[] = globalConfig.environments.map(env => {
			if (names.indexOf(env.name) > -1) {
				return {label: `${env.name}`, description: '✔'}
			}
			return {label: `${env.name}`, description: ''}
		})
		let configureEnvironments = '\u270E Edit Environments...';
		let back = '\u21a9 Back to Workspaces';
		items.push({label: configureEnvironments, description: ''})
		if (vscode.workspace.workspaceFolders.length > 1) {
			items.push({label: back, description: ''})
		}
		choice = await vscode.window.showQuickPick(items, {placeHolder: `Enable environments for ${environmentContext.workspaceFolder.name}`});
		if (choice) {
			if (choice.label === configureEnvironments) {
				vscode.window.showTextDocument(vscode.Uri.file(GLOBAL_ENV_PATH));
				break;
			}
			if (choice.label === back) {
				configureEnvironmentHandler();
				break;
			}
			let index = names.indexOf(choice.label);
			if (index > -1) {
				names.splice(index, 1);
			}
			else names.push(choice.label);
			await writeFile(environmentContext.environmentPath, workspaceEnvironments);
			await changeTextEditorHandler(vscode.window.activeTextEditor);
		}
	} while (choice);
}

async function changeTextEditorHandler(textEditor: vscode.TextEditor | undefined) {
	let configureEnvironmentText = '$(server) Configure Environments';
	try {
		let workspaceEnvironments = await readWorkspaceEnvironments(textEditor.document.fileName);
		if (workspaceEnvironments.names.length === 0) {
			configEnv.text = configureEnvironmentText;
		}
		else if (workspaceEnvironments.names.length === 1) {
			configEnv.text = '$(server) ' + workspaceEnvironments.names[0];
		}
		else {
			configEnv.text = '$(server) ' + workspaceEnvironments.names.length + ' environments';
		}
	}
	catch (e) {
		configEnv.text = configureEnvironmentText;
	}
	configEnv.show();
}

async function writeFile(fsPath: string, obj: GlobalConfig | WorkspaceEnvironments) {
	await fsExtra.ensureFile(fsPath);
	await fsExtra.writeFile(fsPath, JSON.stringify(obj, null, '\t'));
}

export interface LaunchQuickPick extends vscode.QuickPickItem {
	env: EnvironmentConfig;
}