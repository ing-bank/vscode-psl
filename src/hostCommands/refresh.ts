import * as path from "node:path";

import * as fs from "fs-extra";
import * as vscode from "vscode";

import * as utils from "./hostCommandUtils.ts";
import * as environment from "../common/environment.ts";

const icon = utils.icons.REFRESH;

export async function refreshElementHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.FILE) {
		return refreshElement(ctx.fsPath).catch(() => {});
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
			await refreshElement(fsPath).catch(() => {});
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
			await refreshElement(fsPath).catch(() => {});
		}
	}
	return;
}

async function refreshElement(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
	let env: environment.EnvironmentConfig;
	return utils.executeWithProgress(`${icon} ${path.basename(fsPath)} REFRESH`, async () => {
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
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} REFRESH from ${env.name}`);
		const doc = await vscode.workspace.openTextDocument(fsPath);
		await doc.save();
		const connection = await utils.getConnection(env);
		const output = await connection.get(fsPath);
		await utils.writeFileWithSettings(fsPath, output);
		utils.logger.info(
			`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} REFRESH from ${env.name} succeeded`
		);
		connection.close();
		await vscode.window.showTextDocument(doc);
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	});
}

export async function refreshTableHandler(context: utils.ExtensionCommandContext) {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.FILE) {
		let tableName: string;
		if (path.extname(ctx.fsPath) === ".TBL") {
			tableName = path.basename(ctx.fsPath).split(".TBL")[0];
		}
		else if (path.extname(ctx.fsPath) === ".COL") {
			tableName = path.basename(ctx.fsPath).split(".COL")[0].split("-")[0];
		}
		else {
			return;
		}
		const targetDir = path.dirname(ctx.fsPath);
		return refreshTable(tableName, targetDir).catch(() => {});
	}
}


async function refreshTable(tableName: string, targetDirectory: string) {
	let env: environment.EnvironmentConfig;
	await utils.executeWithProgress(`${icon} ${tableName} TABLE REFRESH`, async () => {
		const envs: environment.EnvironmentConfig[] = await utils.getEnvironment(targetDirectory);
		const choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice;
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${tableName} TABLE REFRESH from ${env.name}`);
		const connection = await utils.getConnection(env);
		const output = await connection.getTable(tableName.toUpperCase() + ".TBL");
		const tableFiles = (await fs.readdir(targetDirectory)).filter(f => f.startsWith(tableName));
		for (const file of tableFiles) {
			await fs.remove(file);
		}
		const promises = output.split(String.fromCharCode(0)).map(content => {
			const contentArray = content.split(String.fromCharCode(1));
			const fileName = contentArray[0];
			const fileContent = contentArray[1];
			return utils.writeFileWithSettings(path.join(targetDirectory, fileName), fileContent);
		});
		await Promise.all(promises);
		utils.logger.info(
			`${utils.icons.SUCCESS} ${icon} ${tableName} TABLE REFRESH from ${env.name} succeeded`
		);
		connection.close();
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	});
}
