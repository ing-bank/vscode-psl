import * as path from "node:path";

import * as vscode from "vscode";
import * as fs from "fs-extra";

import * as utils from "./hostCommandUtils.ts";
import * as environment from "../common/environment.ts";
import { EnvironmentConfig } from "../common/environment.ts";

const icon = utils.icons.LINK;

export async function compileAndLinkHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.FILE) {
		return compileAndLink(ctx.fsPath).catch(() => { });
	}
	else if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(ctx.fsPath),
				canSelectMany: true,
				openLabel: "Compile and Link"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await compileAndLink(fsPath).catch(() => { });
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
				openLabel: "Compile and Link"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			await compileAndLink(fsPath).catch(() => { });
		}
	}
	return;
}

async function compileAndLink(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
	let envs: EnvironmentConfig[];
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
	const promises = [];
	await vscode.workspace.openTextDocument(fsPath).then(doc => doc.save());
	for (const env of envs) {
		// TODO: (Mischa Reitsma, 2026-01-23) Indent hell! Fix!
		promises.push(
			utils.executeWithProgress(`${icon} ${path.basename(fsPath)} COMPILE AND LINK`, async () => {
				utils.logger.info(
					`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} ` +
					`COMPILE AND LINK in ${env.name}`
				);
				const connection = await utils.getConnection(env);
				const output = await connection.compileAndLink(fsPath);
				connection.close();
				if (output.includes("compile and link successful")) {
					utils.logger.info(
						`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)}` +
						` COMPILE AND LINK ${env.name} successful`
					);
				}
				else {
					utils.logger.error(`${utils.icons.ERROR} ${icon} ${output}`);
				}
			}).catch((e: Error) => {
				utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
			})
		);
	}
	await Promise.all(promises);
}
