import * as path from "node:path";

import * as fs from "fs-extra";
import * as vscode from "vscode";

import * as utils from "./hostCommandUtils.ts";
import * as environment from "../common/environment.ts";

const icon = utils.icons.SEND;

export async function sendElementHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.EMPTY) {
		const quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		const chosenEnv = quickPick;
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(chosenEnv.fsPath),
				canSelectMany: true,
				openLabel: "Send"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath).sort(tableFirst)) {
			await sendElement(fsPath).catch(() => { });
		}
	}
	else if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(ctx.fsPath),
				canSelectMany: true,
				openLabel: "Send"
			}
		);
		if (!files) return;
		const sortedFiles = files.map(uri => uri.fsPath).sort(tableFirst);
		for (const fsPath of sortedFiles) {
			await sendElement(fsPath).catch(() => { });
		}
	}
	if (ctx.mode === utils.ContextMode.FILE) {
		return sendElement(ctx.fsPath).catch(() => { });
	}
	return;
}

export async function sendTableHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	if (ctx.mode === utils.ContextMode.EMPTY) {
		return;
	}
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
		const files = await fs.readdir(path.dirname(ctx.fsPath));
		const sortedFiles = files.filter(f => f.startsWith(tableName)).sort(tableFirst);
		if (sortedFiles.length > 99) {
			const resp = await vscode.window.showInformationMessage(
				`Send ${sortedFiles.length} elements of ${tableName}?`,
				{ modal: true },
				"Yes"
			);
			if (resp !== "Yes") return;
		}
		for (const file of sortedFiles) {
			await sendElement(path.join(path.dirname(ctx.fsPath), file)).catch(() => { });
		}
	}
	return;
}

async function sendElement(fsPath: string) {
	if (!fs.statSync(fsPath).isFile()) return;
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
	const promises: Promise<void>[] = [];
	for (const env of envs) {
		promises.push(utils.executeWithProgress(`${icon} ${path.basename(fsPath)} SEND`, async () => {
			await vscode.workspace.openTextDocument(fsPath).then(doc => doc.save());
			utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} SEND to ${env.name}`);
			const connection = await utils.getConnection(env);
			await connection.send(fsPath);
			connection.close();
			utils.logger.info(
				`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} SEND to ${env.name} successful`
			);
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}));
	};
	await Promise.all(promises);
}

function tableFirst(a: string, b: string) {
	const aIsTable = a.endsWith(".TBL");
	const bIsTable = b.endsWith(".TBL");
	if (aIsTable && !bIsTable) {
		return -1;
	}
	else if (bIsTable && !aIsTable) {
		return 1;
	}
	return a.localeCompare(b);
}
