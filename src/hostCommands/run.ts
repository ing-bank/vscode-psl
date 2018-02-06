import * as vscode from 'vscode';
import * as utils from './hostCommandUtils';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as environment from '../common/environment';

const icon = utils.icons.RUN;

export async function runPSLHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		return runPSL(c.fsPath).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Run PSL' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath).catch(() => { });
		}
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Run PSL' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath).catch(() => { });
		}
	}
	return;
}

async function runPSL(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return
	await vscode.workspace.openTextDocument(fsPath).then(doc => doc.save());
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
	for (let env of envs) {
		promises.push(utils.executeWithProgress(`${icon} ${path.basename(fsPath)} RUN`, async () => {
			utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} RUN in ${env.name}`);
			let connection = await utils.getConnection(env);
			let output = await connection.run(fsPath);
			connection.close();
			utils.logger.info(output.trim());
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}))
	}
	await Promise.all(promises);
}