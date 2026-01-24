import * as os from "node:os";
import * as path from "node:path";

import * as fs from "fs-extra";
import * as jsonc from "jsonc-parser";
import * as vscode from "vscode";

const configEnvCommand = "psl.configureEnvironment";

const LOCAL_ENV_DIR = path.join(".vscode", "environment.json");

const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 900);
statusBar.command = configEnvCommand;

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand(
			configEnvCommand, configureEnvironmentHandler
		)
	);

	context.subscriptions.push(statusBar);

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => changeTextEditorHandler(e)));
	changeTextEditorHandler(vscode.window.activeTextEditor);

}

export interface EnvironmentConfig {
	name: string;
	host: string;
	port: number;
	user: string;
	password: string;
	sshLogin?: string;
	serverType?: string;
	encoding?: BufferEncoding;
}

interface GlobalConfig {
	environments: EnvironmentConfig[]
}

interface WorkspaceEnvironments {
	names: string[]
}

interface WorkspaceQuickPick extends vscode.QuickPickItem {
	fsPath: string;
}

export async function workspaceQuickPick(): Promise<WorkspaceQuickPick | undefined> {
	try {
		await GlobalFile.read();
	}
	catch {
		const defaultConfig: GlobalConfig = {
			environments: [
				{
					name: "",
					host: "",
					port: 0,
					user: "",
					password: "",
					sshLogin: "",
					serverType: "SCA$IBS",
					encoding: "utf8"
				}
			]
		};
		await GlobalFile.write(defaultConfig);
		await GlobalFile.show();
		return;
	}
	if (!vscode.workspace.workspaceFolders) return;
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const items: WorkspaceQuickPick[] = await Promise.all(workspaceFolders.map(async folder => {
		let name: string;
		try {
			const envObjects = await new WorkspaceFile(folder.uri.fsPath).environmentObjects;
			if (envObjects.length === 1) {
				name = "\u00a0 \u00a0 $(server) " + envObjects[0].name;
			}
			else if (envObjects.length > 1) {
				name = "\u00a0 \u00a0 $(server) " + envObjects.map(e => e.name).join(", ");
			}
			else {
				name = "\u00a0 \u00a0 Not configured";
			}
		}
		catch {
			name = "\u00a0 \u00a0 Not configured";
		}
		return {
			label: "$(file-directory) " + folder.name,
			description: folder.uri.fsPath,
			detail: name,
			fsPath: folder.uri.fsPath
		};
	}));
	if (items.length === 1) return items[0];
	const configureEnvironments = "\u270E Edit Environments...";
	items.push({ label: configureEnvironments, description: "", fsPath: "" });
	const choice = await vscode.window.showQuickPick(items, { placeHolder: "Select a Workspace." });
	if (!choice) return;
	if (choice.label === configureEnvironments) {
		await GlobalFile.show();
		return;
	}
	return choice;
}

async function configureEnvironmentHandler() {
	const workspace = await workspaceQuickPick();
	if (!workspace) return;
	environmentQuickPick(new WorkspaceFile(workspace.fsPath));
}

async function environmentQuickPick(workspaceFile: WorkspaceFile) {
	let choice = undefined;
	let workspaceEnvironments: WorkspaceEnvironments;
	let globalConfig: GlobalConfig;
	let names: string[];
	try {
		globalConfig = await GlobalFile.read();
	}
	catch (e) {
		if (e === GlobalFile.INVALID_CONFIG) {
			await GlobalFile.show();
		}

		const defaultConfig: GlobalConfig = {
			environments: [
				{ name: "",
					host: "",
					port: 0,
					user: "",
					password: "",
					sshLogin: ""
				}
			]
		};
		await GlobalFile.write(defaultConfig);
		await GlobalFile.show();
		return;
	}

	try {
		workspaceEnvironments = await workspaceFile.environment;
		names = workspaceEnvironments.names;
	}
	catch {
		await workspaceFile.writeLocalEnv({"names": []});
		workspaceEnvironments = await workspaceFile.environment;
		names = workspaceEnvironments.names;
	}
	do {
		const items: vscode.QuickPickItem[] = globalConfig.environments.map(env => {
			if (names.indexOf(env.name) > -1) {
				return { label: `${env.name}`, description: "✔" };
			}
			return { label: `${env.name}`, description: "" };
		});
		const configureEnvironments = "\u270E Edit Environments...";
		const back = "\u21a9 Back to Workspaces";
		items.push({ label: configureEnvironments, description: "" });
		if (vscode.workspace.workspaceFolders.length > 1) {
			items.push({ label: back, description: "" });
		}
		choice = await vscode.window.showQuickPick(
			items,
			{ placeHolder: `Enable environments for ${workspaceFile.workspaceFolder.name}` }
		);
		if (choice) {
			if (choice.label === configureEnvironments) {
				GlobalFile.show();
				break;
			}
			if (choice.label === back) {
				configureEnvironmentHandler();
				break;
			}
			const index = names.indexOf(choice.label);
			if (index > -1) {
				names.splice(index, 1);
			}
			else {
				names.push(choice.label);
			}
			workspaceFile.writeLocalEnv(workspaceEnvironments);
		}
	} while (choice);
	await changeTextEditorHandler(vscode.window.activeTextEditor);
}

async function changeTextEditorHandler(textEditor: vscode.TextEditor | undefined) {
	const configureEnvironmentText = "$(server) Configure Environments";
	try {
		const workspaceFile = new WorkspaceFile(textEditor.document.fileName);
		const workspaceEnvironments = await workspaceFile.environment;
		if (workspaceEnvironments.names.length === 0) {
			statusBar.text = configureEnvironmentText;
		}
		else if (workspaceEnvironments.names.length === 1) {
			statusBar.text = "$(server) " + workspaceEnvironments.names[0];
		}
		else {
			statusBar.text = "$(server) " + workspaceEnvironments.names.length + " environments";
		}
	}
	catch {
		statusBar.text = configureEnvironmentText;
	}
	statusBar.show();
}


export interface LaunchQuickPick extends vscode.QuickPickItem {
	env: EnvironmentConfig;
}

export class WorkspaceFile {

	/**
	 * The file system path of the file.
	 */
	readonly fsPath: string;

	/**
	 * The file system path of the file.
	 */
	readonly environmentPath: string;

	/**
	 * The file system path of the file.
	 */
	readonly workspaceFolder: vscode.WorkspaceFolder | undefined = undefined;

	/**
	 * Contents of local environment.json
	 */
	private _environment: WorkspaceEnvironments = undefined;

	/**
	 * Environment configurations from global environments.json
	 * corresponding to names in local environment.json
	 */
	private _environmentObjects: EnvironmentConfig[] = undefined;

	/**
	 * @param {string} fsPath The file system path of the file.
	 */
	constructor(fsPath: string) {
		this.fsPath = fsPath;

		if (!fsPath) {
			this.environmentPath = "";
			return;
		}

		this.workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
		if (!this.workspaceFolder) {
			this.environmentPath = "";
		}
		else {
			this.environmentPath = path.join(this.workspaceFolder.uri.fsPath, LOCAL_ENV_DIR);
		}
	}

	/**
	 * Environment configurations from global environments.json
	 * corresponding to names in local environment.json
	 */
	get environmentObjects(): Promise<EnvironmentConfig[]> {
		if (this._environmentObjects) return Promise.resolve(this._environmentObjects);
		return this.getEnvironmentObjects();
	}

	private async getEnvironmentObjects() {
		const environment = await this.environment;
		const globalEnv = await this.getEnvironmentFromGlobalConfig(environment.names);
		this._environmentObjects = globalEnv;
		return this._environmentObjects;
	}

	/**
	 * 
	 * @param nameArray An array of names to match the names of configurations in the GlobalConfig.
	 */
	private async getEnvironmentFromGlobalConfig(nameArray: string[]): Promise<EnvironmentConfig[]> {
		const allEnvs = (await GlobalFile.read()).environments;
		const ret: EnvironmentConfig[] = [];
		for (const name of nameArray) {
			for (const env of allEnvs) {
				if (env.name === name) {
					ret.push(env);
				}
			}
		}
		return ret;
	}

	/**
	 * Contents of local environment.json
	 */
	get environment(): Promise<WorkspaceEnvironments> {
		if (this._environment) return Promise.resolve(this._environment);
		return fs.readFile(this.environmentPath).then(async file => {
			const localEnvironment: WorkspaceEnvironments = jsonc.parse(file.toString());
			if (!localEnvironment.names || !Array.isArray(localEnvironment.names)) {
				throw new Error("Local environment.json is not properly configured.");
			}
			this._environment = localEnvironment;
			return localEnvironment;
		});
	}

	async writeLocalEnv(newLocalEnv: WorkspaceEnvironments) {
		// TODO prune names
		await fs.ensureFile(this.environmentPath);
		await fs.writeFile(this.environmentPath, JSON.stringify(newLocalEnv, null, "\t"));
	}
}

export class GlobalFile {

	/**
	 * Path to the global config file
	 */
	private static readonly path = (() => {
		const envFileName = "environments.json";
		const appdata = (
			process.env.APPDATA ||
			process.platform === "darwin" ?
				process.env.HOME + "/Library/Application Support"
				: "/var/local"
		);
		let channelPath: string;
		if (vscode.env.appName.indexOf("Insiders") > 0) {
			channelPath = "Code - Insiders";
		} else {
			channelPath = "Code";
		}
		let envPath = path.join(appdata, channelPath, "User", envFileName);
		// in linux, it may not work with /var/local, then try to use /home/myuser/.config
		if ((process.platform === "linux") && (!fs.existsSync(envPath))) {
			envPath = path.join(os.homedir(), ".config/", channelPath, "User", envFileName);
		}
		return envPath;
	})();

	static readonly INVALID_CONFIG = new Error("Missing environments in global config.");

	/**
	 * Reads and returns the contents of the file.
	 * 
	 * @throws An error if parsing fails or if improperly formatted.
	 */
	static async read(): Promise<GlobalConfig> {
		const globalConfig = jsonc.parse((await fs.readFile(this.path)).toString());
		if (!globalConfig.environments) throw this.INVALID_CONFIG;
		return globalConfig;
	}

	/**
	 * Writes the new configuration to the file.
	 * 
	 * @param newGlobalConfig The new configuration.
	 */
	static async write(newGlobalConfig: GlobalConfig) {
		await fs.ensureFile(this.path);
		await fs.writeFile(this.path, JSON.stringify(newGlobalConfig, null, "\t"));
	}

	/**
	 * Shows the configuration file in the editor window.
	 */
	static async show() {
		await vscode.window.showTextDocument(vscode.Uri.file(this.path));
	}
}
