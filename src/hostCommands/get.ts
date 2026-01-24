import * as path from "node:path";

import * as fs from "fs-extra";
import * as vscode from "vscode";

import { extensionToDescription } from "@profile-psl/profile-connector/utils.js";

import * as utils from "./hostCommandUtils.ts";
import * as environment from "../common/environment.ts";
import { MumpsVirtualDocument } from "../language/mumps.ts";

const icon = utils.icons.GET;

export async function getElementHandler(context: utils.ExtensionCommandContext): Promise<void> {

	// TODO: (Mischa Reitsma, 2026-01-23) the target vars here are any, can be a type, but there are also weird returns. Reconsider types, method body and method signature. This TODO also holds for the other functions.
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const input = await promptUserForComponent();
		if (input) return getElement(path.join(ctx.fsPath, input)).catch(() => { });
	}
	else if (ctx.mode === utils.ContextMode.FILE) {
		const workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(ctx.fsPath));
		if (!workspace) {
			// skeptical of this approach
			return;
		}
		const input = await promptUserForComponent();
		if (!input) return;
		const extension = path.extname(input).replace(".", "");
		const description = extensionToDescription[extension];
		const filters: { [name: string]: string[] } = {};
		filters[description] = [extension];
		const currentFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(ctx.fsPath));
		if (!currentFolder) return;
		let target;
		const defaultDir = DIR_MAPPINGS[extension];
		if (defaultDir) {
			target = { fsPath: path.join(currentFolder.uri.fsPath, defaultDir, input) };
		}
		else {
			const defaultUri = vscode.Uri.file(path.join(currentFolder.uri.fsPath, input));
			target = await vscode.window.showSaveDialog({ defaultUri, filters: filters });
		}
		if (!target) return;
		return getElement(target.fsPath).catch(() => { });
	}
	else {
		const quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		const chosenEnv = quickPick;
		const input = await promptUserForComponent();
		if (!input) return;
		const extension = path.extname(input).replace(".", "");
		const description = extensionToDescription[extension];
		const filters: { [name: string]: string[] } = {};
		filters[description] = [extension];
		let target;
		const defaultDir = DIR_MAPPINGS[extension];
		if (defaultDir) {
			target = { fsPath: path.join(chosenEnv.fsPath, defaultDir, input) };
		}
		else {
			const defaultUri = vscode.Uri.file(path.join(chosenEnv.fsPath, input));
			target = await vscode.window.showSaveDialog({ defaultUri, filters: filters });
		}
		if (!target) return;
		return getElement(target.fsPath).catch(() => { });
	}
	return;
}

export async function getTableHandler(context: utils.ExtensionCommandContext) {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const input = await promptUserForTable();
		if (input) return getTable(input, ctx.fsPath, ctx.fsPath).catch(() => { });
	}
	else if (ctx.mode === utils.ContextMode.FILE) {
		const workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(ctx.fsPath));
		if (!workspace) {
			// skeptical of this approach
			return;
		}
		const tableName = await promptUserForTable();
		if (!tableName) return;
		const tableDir = DIR_MAPPINGS["TABLE"];
		let target;
		if (tableDir) {
			target = [{ fsPath: path.join(workspace.uri.fsPath, tableDir) }];
		}
		else {
			target = await vscode.window.showOpenDialog(
				{
					defaultUri: workspace.uri,
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					filters: { "Table Directory": [] }
				}
			);
		}
		if (!target) return;
		return getTable(tableName, target[0].fsPath, workspace.uri.fsPath).catch(() => { });
	}
	else {
		const quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		const chosenEnv = quickPick;
		const tableName = await promptUserForTable();
		if (!tableName) return;
		const tableDir = DIR_MAPPINGS["TABLE"];
		let target;
		if (tableDir) {
			target = [{ fsPath: path.join(chosenEnv.description, tableDir) }];
		}
		else {
			target = await vscode.window.showOpenDialog(
				{
					defaultUri: vscode.Uri.file(chosenEnv.description),
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					filters: { "Table Directory": [] }
				}
			);
		}
		if (!target) return;
		return getTable(tableName, target[0].fsPath, chosenEnv.description).catch(() => { });
	}
	return;
}

export async function getCompiledCodeHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.FILE) {
		return getCompiledCode(ctx.fsPath).catch(() => {});
	}
	else if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(ctx.fsPath),
				canSelectMany: true,
				openLabel: "Refresh"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await getCompiledCode(fsPath).catch(() => {});
		}
	}
	else {
		const quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		const chosenEnv = quickPick;
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(chosenEnv.fsPath),
				canSelectMany: true,
				openLabel: "Refresh"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await getCompiledCode(fsPath).catch(() => {});
		}
	}
	return;
}

async function getCompiledCode(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
	let env: environment.EnvironmentConfig;
	const routineName = `${path.basename(fsPath).split(".")[0]}.m`;
	return utils.executeWithProgress(`${icon} ${path.basename(fsPath)} GET`, async () => {
		let envs: environment.EnvironmentConfig[];
		try {
			envs = await utils.getEnvironment(fsPath);
		}
		catch {
			utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
			return;
		}
		if (envs.length === 0) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
			return;
		}
		const choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice;
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${routineName} GET COMPILED from ${env.name}`);
		const doc = await vscode.workspace.openTextDocument(fsPath);
		await doc.save();
		const connection = await utils.getConnection(env);
		const output = await connection.get(routineName);
		const uri = vscode.Uri.parse(`${MumpsVirtualDocument.schemes.compiled}:/${env.name}/${routineName}`);
		const virtualDocument = new MumpsVirtualDocument(routineName, output, uri);
		utils.logger.info(
			`${utils.icons.SUCCESS} ${icon} ${routineName} GET COMPILED from ${env.name} succeeded`
		);
		connection.close();
		vscode.window.showTextDocument(virtualDocument.uri, {preview: false});
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	});
}

async function getElement(fsPath: string) {
	let env: environment.EnvironmentConfig;
	await utils.executeWithProgress(`${icon} ${path.basename(fsPath)} GET`, async () => {
		let envs: environment.EnvironmentConfig[];
		try {
			envs = await utils.getEnvironment(fsPath);
		}
		catch {
			utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
			return;
		}
		if (envs.length === 0) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
			return;
		}
		const choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice;
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} GET from ${env.name}`);
		const connection = await utils.getConnection(env);
		const output = await connection.get(fsPath);
		await fs.ensureDir(path.dirname(fsPath));
		await utils.writeFileWithSettings(fsPath, output);
		utils.logger.info(
			`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} GET from ${env.name} succeeded`
		);
		connection.close();
		await vscode.workspace.openTextDocument(fsPath).then(vscode.window.showTextDocument);
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	});
	return;
}

async function getTable(tableName: string, targetDirectory: string, workpacePath: string) {
	let env: environment.EnvironmentConfig;
	await utils.executeWithProgress(`${icon} ${tableName} TABLE GET`, async () => {
		let envs: environment.EnvironmentConfig[];
		try {
			envs = await utils.getEnvironment(workpacePath);
		}
		catch {
			utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
			return;
		}
		if (envs.length === 0) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
			return;
		}
		const choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice; utils.logger.info(`${utils.icons.WAIT} ${icon} ${tableName} TABLE GET from ${env.name}`);
		const connection = await utils.getConnection(env);
		const output = await connection.getTable(tableName.toUpperCase() + ".TBL");
		await fs.ensureDir(path.join(targetDirectory, tableName.toLowerCase()));
		const tableFiles = (await fs.readdir(targetDirectory)).filter(f => f.startsWith(tableName));
		for (const file of tableFiles) {
			await fs.remove(file);
		}
		const promises = output.split(String.fromCharCode(0)).map(content => {
			const contentArray = content.split(String.fromCharCode(1));
			const fileName = contentArray[0];
			const fileContent = contentArray[1];
			return utils.writeFileWithSettings(
				path.join(targetDirectory, tableName.toLowerCase(), fileName),
				fileContent
			);
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
	});
	return;
}

async function promptUserForComponent() {
	const inputOptions: vscode.InputBoxOptions = {
		prompt: "Name of Component (with extension)", validateInput: (input: string) => {
			if (!input) return;
			const extension = path.extname(input) ? path.extname(input).replace(".", "") : "No extension";
			if (extension in extensionToDescription) return "";
			return `Invalid extension (${extension})`;
		}
	};
	return vscode.window.showInputBox(inputOptions);
}

async function promptUserForTable() {
	const inputOptions: vscode.InputBoxOptions = {
		prompt: "Name of Table (no extension)", 
		validateInput: (value: string) => {
			if (!value) return;
			if (value.includes(".")) return "Do not include the extension";
		}
	};
	return vscode.window.showInputBox(inputOptions);
}

const DIR_MAPPINGS = {
	"BATCH": "dataqwik/batch",
	"COL": "",
	"DAT": "data",
	"FKY": "dataqwik/foreign_key",
	// "G": "Global",
	"IDX": "dataqwik/index",
	"JFD": "dataqwik/journal",
	"m": "routine",
	"PPL": "",
	"PROC": "dataqwik/procedure",
	"properties": "property",
	"PSL": "",
	"psl": "",
	"pslx": "",
	"pslxtra": "",
	"psql": "",
	"QRY": "dataqwik/query",
	"RPT": "dataqwik/report",
	"SCR": "dataqwik/screen",
	// TABLE not supported
	"TABLE": "dataqwik/table",
	"TBL": "",
	"TRIG": "dataqwik/trigger",
};
