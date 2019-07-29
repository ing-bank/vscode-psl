import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import * as environment from '../common/environment';
import * as utils from './hostCommandUtils';

const icon = utils.icons.RUN;

export async function runPSLHandler(context: utils.ExtensionCommandContext): Promise<void> {
	handle(context);
}

async function handle(context: utils.ExtensionCommandContext): Promise<void> {
	const c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		return runPSL(c.fsPath).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		const files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Run PSL' });
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath).catch(() => { });
		}
	}
	else {
		const quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		const chosenEnv = quickPick;
		const files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Run PSL' });
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath).catch(() => { });
		}
	}
	return;
}

async function runPSL(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
	const doc = await vscode.workspace.openTextDocument(fsPath);
	await doc.save();
	let envs: environment.EnvironmentConfig[];
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
	const promises = [];
	for (const env of envs) {
		promises.push(utils.executeWithProgress(`${icon} ${path.basename(fsPath)} RUN`, async () => {
			utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} RUN in ${env.name}`);
			const connection = await utils.getConnection(env);
			const output: string = await connection.runPsl(fsPath);
			connection.close();
			utils.logger.info(output.trim());
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}));
	}
	await Promise.all(promises);
}
