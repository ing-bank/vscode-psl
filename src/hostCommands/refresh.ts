import * as vscode from 'vscode';
import * as utils from './hostCommandUtils';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as environment from '../common/environment';

const icon = utils.icons.REFRESH;

export async function refreshElementHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		return refreshElement(c.fsPath).catch(() => {});
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		let files = await vscode.window.showOpenDialog({defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Refresh'})
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await refreshElement(fsPath).catch(() => {});
		}
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let files = await vscode.window.showOpenDialog({defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Refresh'})
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await refreshElement(fsPath).catch(() => {})
		}
	}
	return;
}

async function refreshElement(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
	let env;
	return utils.executeWithProgress(`${icon} ${path.basename(fsPath)} REFRESH`, async () => {
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
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} REFRESH from ${env.name}`);
		let doc = await vscode.workspace.openTextDocument(fsPath);
		await doc.save();
		let connection = await utils.getConnection(env);
		let output = await connection.get(fsPath);
		await utils.writeFileWithSettings(fsPath, output);
		utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} REFRESH from ${env.name} succeeded`);
		connection.close();
		await vscode.window.showTextDocument(doc);
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	})
}

export async function refreshTableHandler(context: utils.ExtensionCommandContext) {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		let tableName: string;
		if (path.extname(c.fsPath) === '.TBL') {
			tableName = path.basename(c.fsPath).split('.TBL')[0];
		}
		else if (path.extname(c.fsPath) === '.COL') {
			tableName = path.basename(c.fsPath).split('.COL')[0].split('-')[0];
		}
		else {
			return;
		}
		let targetDir = path.dirname(c.fsPath);
		return refreshTable(tableName, targetDir).catch(() => {});
	}
}


async function refreshTable(tableName: string, targetDirectory: string) {
	let env;
	await utils.executeWithProgress(`${icon} ${tableName} TABLE REFRESH`, async () => {
		let envs = await utils.getEnvironment(targetDirectory);
		let choice = await utils.getCommandenvConfigQuickPick(envs);
		if (!choice) return;
		env = choice;
		utils.logger.info(`${utils.icons.WAIT} ${icon} ${tableName} TABLE REFRESH from ${env.name}`);
		let connection = await utils.getConnection(env);
		let output = await connection.getTable(tableName.toUpperCase() + '.TBL');
		let tableFiles = (await fs.readdir(targetDirectory)).filter(f => f.startsWith(tableName));
		for (let file of tableFiles) {
			await fs.remove(file);
		}
		const promises = output.split(String.fromCharCode(0)).map(content => {
			const contentArray = content.split(String.fromCharCode(1));
			const fileName = contentArray[0];
			const fileContent = contentArray[1];
			return utils.writeFileWithSettings(path.join(targetDirectory, fileName), fileContent);
		});
		await Promise.all(promises);
		utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${tableName} TABLE REFRESH from ${env.name} succeeded`);
		connection.close();
	}).catch((e: Error) => {
		if (env && env.name) {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${e.message}`);
		}
	})
}
