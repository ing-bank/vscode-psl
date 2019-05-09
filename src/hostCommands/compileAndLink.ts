import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

import * as utils from './hostCommandUtils';
import * as environment from '../common/environment'

const icon = utils.icons.LINK;

export async function compileAndLinkHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		return compileAndLink(c.fsPath).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Compile and Link' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await compileAndLink(fsPath).catch(() => { });
		}
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Compile and Link' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await compileAndLink(fsPath).catch(() => { });
		}
	}
	return;
}

async function compileAndLink(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return
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
	let promises = []
	await vscode.workspace.openTextDocument(fsPath).then(doc => doc.save());
	for (let env of envs) {
		promises.push(utils.executeWithProgress(`${icon} ${path.basename(fsPath)} COMPILE AND LINK`, async () => {
			utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} COMPILE AND LINK in ${env.name}`);
			let connection = await utils.getConnection(env);
			let output = await connection.compileAndLink(fsPath);
			connection.close();
			if (output.includes('compile and link successful')) utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} COMPILE AND LINK ${env.name} successful`)
			else utils.logger.error(`${utils.icons.ERROR} ${icon} ${output}`);
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}))
	}
	await Promise.all(promises);
}
