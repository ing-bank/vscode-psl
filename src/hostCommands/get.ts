import * as vscode from 'vscode';
import * as utils from './hostCommandUtils';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as environment from '../common/environment';

const icon = utils.icons.GET;

export async function getElementHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.DIRECTORY) {
		let input = await promptUserForComponent();
		if (input) return getElement(path.join(c.fsPath, input)).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.FILE) {
		let workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(c.fsPath));
		if (!workspace) {
			// skeptical of this approach
			return;
		}
		let input = await promptUserForComponent();
		if (!input) return;
		let extension = path.extname(input).replace('.', '');
		let description = utils.extensionToDescription[extension]
		let filters: { [name: string]: string[] } = {}
		filters[description] = [extension]
		let currentFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(c.fsPath))
		if (!currentFolder) return;
		let target
		let defaultDir = DIR_MAPPINGS[extension];
		if (defaultDir) {
			target = { fsPath: path.join(currentFolder.uri.fsPath, defaultDir, input) }
		}
		else {
			let defaultUri = vscode.Uri.file(path.join(currentFolder.uri.fsPath, input))
			target = await vscode.window.showSaveDialog({ defaultUri, filters: filters });
		}
		if (!target) return;
		return getElement(target.fsPath).catch(() => { });
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let input = await promptUserForComponent();
		if (!input) return;
		let extension = path.extname(input).replace('.', '');
		let description = utils.extensionToDescription[extension]
		let filters: { [name: string]: string[] } = {}
		filters[description] = [extension]
		let target
		let defaultDir = DIR_MAPPINGS[extension];
		if (defaultDir) {
			target = { fsPath: path.join(chosenEnv.fsPath, defaultDir, input) }
		}
		else {
			let defaultUri = vscode.Uri.file(path.join(chosenEnv.fsPath, input))
			target = await vscode.window.showSaveDialog({ defaultUri, filters: filters });
		}
		if (!target) return;
		return getElement(target.fsPath).catch(() => { });
	}
	return;
}

export async function getTableHandler(context: utils.ExtensionCommandContext) {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.DIRECTORY) {
		let input = await promptUserForTable();
		if (input) return getTable(input, c.fsPath, c.fsPath).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.FILE) {
		let workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(c.fsPath));
		if (!workspace) {
			// skeptical of this approach
			return;
		}
		let tableName = await promptUserForTable();
		if (!tableName) return;
		let tableDir = DIR_MAPPINGS['TABLE']
		let target;
		if (tableDir) {
			target = [{ fsPath: path.join(workspace.uri.fsPath, tableDir) }]
		}
		else {
			target = await vscode.window.showOpenDialog({ defaultUri: workspace.uri, canSelectFiles: false, canSelectFolders: true, canSelectMany: false, filters: { 'Table Directory': [] } });
		}
		if (!target) return;
		return getTable(tableName, target[0].fsPath, workspace.uri.fsPath).catch(() => { });
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let tableName = await promptUserForTable();
		if (!tableName) return;
		let tableDir = DIR_MAPPINGS['TABLE']
		let target;
		if (tableDir) {
			target = [{ fsPath: path.join(chosenEnv.description, tableDir) }]
		}
		else {
			target = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.description), canSelectFiles: false, canSelectFolders: true, canSelectMany: false, filters: { 'Table Directory': [] } });
		}
		if (!target) return;
		return getTable(tableName, target[0].fsPath, chosenEnv.description).catch(() => { });
	}
	return;
}

async function getElement(fsPath: string) {
	let env;
	await utils.executeWithProgress(`${icon} ${path.basename(fsPath)} GET`, async () => {
		let envs;
		try {
			envs = await utils.getEnvironment(fsPath);
		}
		catch (e) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
			return;
		}
		if (envs.length === 0) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
			return;
		}
		let choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice;
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} GET from ${env.name}`);
		let connection = await utils.getConnection(env);
		let output = await connection.get(fsPath);
		await fs.ensureDir(path.dirname(fsPath))
		await utils.writeFileWithSettings(fsPath, output);
		utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} GET from ${env.name} succeeded`);
		connection.close();
		await vscode.workspace.openTextDocument(fsPath).then(vscode.window.showTextDocument)
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	})
	return;
}

async function getTable(tableName: string, targetDirectory: string, workpacePath: string) {
	let env;
	await utils.executeWithProgress(`${icon} ${tableName} TABLE GET`, async () => {
		let envs;
		try {
			envs = await utils.getEnvironment(workpacePath);
		}
		catch (e) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
			return;
		}
		if (envs.length === 0) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
			return;
		}
		let choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice; utils.logger.info(`${utils.icons.WAIT} ${icon} ${tableName} TABLE GET from ${env.name}`);
		let connection = await utils.getConnection(env);
		let output = await connection.getTable(tableName.toUpperCase() + '.TBL');
		await fs.ensureDir(path.join(targetDirectory, tableName.toLowerCase()));
		let tableFiles = (await fs.readdir(targetDirectory)).filter(f => f.startsWith(tableName));
		for (let file of tableFiles) {
			await fs.remove(file);
		}
		const promises = output.split(String.fromCharCode(0)).map(content => {
			const contentArray = content.split(String.fromCharCode(1));
			const fileName = contentArray[0];
			const fileContent = contentArray[1];
			return utils.writeFileWithSettings(path.join(targetDirectory, tableName.toLowerCase(), fileName), fileContent);
		});
		await Promise.all(promises);
		utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${tableName} TABLE GET from ${env.name} succeeded`);
		connection.close();
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	})
	return;
}

async function promptUserForComponent() {
	let inputOptions: vscode.InputBoxOptions = {
		prompt: 'Name of Component (with extension)', validateInput: (input: string) => {
			if (!input) return;
			let extension = path.extname(input) ? path.extname(input).replace('.', '') : 'No extension'
			if (extension in utils.extensionToDescription) return '';
			return `Invalid extension (${extension})`;
		}
	};
	return vscode.window.showInputBox(inputOptions);
}

async function promptUserForTable() {
	let inputOptions: vscode.InputBoxOptions = {
		prompt: 'Name of Table (no extension)', 
		validateInput: (value: string) => {
			if (!value) return;
			if (value.includes('.')) return 'Do not include the extension';
		}
	};
	return vscode.window.showInputBox(inputOptions);
}

const DIR_MAPPINGS = {
	'BATCH': 'dataqwik/batch',
	'COL': '',
	'DAT': 'data',
	'FKY': 'dataqwik/foreign_key',
	// 'G': 'Global',
	'IDX': 'dataqwik/index',
	'JFD': 'dataqwik/journal',
	'm': 'routine',
	'PPL': '',
	'PROC': 'dataqwik/procedure',
	'properties': 'property',
	'PSL': '',
	'psl': '',
	'pslx': '',
	'pslxtra': '',
	'psql': '',
	'QRY': 'dataqwik/query',
	'RPT': 'dataqwik/report',
	'SCR': 'dataqwik/screen',
	// TABLE not supported
	'TABLE': 'dataqwik/table',
	'TBL': '',
	'TRIG': 'dataqwik/trigger',
}
