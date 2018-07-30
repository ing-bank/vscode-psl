import * as vscode from 'vscode';
import * as utils from './hostCommandUtils';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as environment from '../common/environment';

const icon = utils.icons.SEND;

export async function sendElementHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.EMPTY) {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Send' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath).sort(tableFirst)) {
			await sendElement(fsPath).catch(() => { });
		}
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Send' });
		if (!files) return;
		let sortedFiles = files.map(uri => uri.fsPath).sort(tableFirst);
		for (let fsPath of sortedFiles) {
			await sendElement(fsPath).catch(() => { });
		}
	}
	if (c.mode === utils.ContextMode.FILE) {
		return sendElement(c.fsPath).catch(() => { });
	}
	return;
}

export async function sendTableHandler(context: utils.ExtensionCommandContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.EMPTY) {
		return;
	}
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
		let files = await fs.readdir(path.dirname(c.fsPath))
		let sortedFiles = files.filter(f => f.startsWith(tableName)).sort(tableFirst);
		if (sortedFiles.length > 99) {
			let resp = await vscode.window.showInformationMessage(`Send ${sortedFiles.length} elements of ${tableName}?`, { modal: true }, 'Yes');
			if (resp !== 'Yes') return;
		}
		for (let file of sortedFiles) {
			await sendElement(path.join(path.dirname(c.fsPath), file)).catch(() => { });
		}
	}
	return;
}

// async function sendDirectory(targetDir: string) {
// 	let fileNames = await fs.readdir(targetDir);
// 	let word = fileNames.length === 1 ? 'file' : 'files';
// 	let resp = await vscode.window.showInformationMessage(`Send contents of ${targetDir} (${fileNames.length} ${word})?`, { modal: true }, 'Yes');
// 	if (resp !== 'Yes') return;
// 	fileNames.sort(tableFirst);
// 	for (let index = 0; index < fileNames.length; index++) {
// 		let fileName = fileNames[index];
// 		// TODO what if element is a directory?
// 		await sendElement(path.join(targetDir, fileName));
// 	}
// }

async function sendElement(fsPath: string) {
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
	let promises: Promise<void>[] = []
	for (let env of envs) {
		promises.push(utils.executeWithProgress(`${icon} ${path.basename(fsPath)} SEND`, async () => {
			await vscode.workspace.openTextDocument(fsPath).then(doc => doc.save())
			utils.logger.info(`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)} SEND to ${env.name}`);
			let connection = await utils.getConnection(env);
			await connection.send(fsPath);
			connection.close();
			utils.logger.info(`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} SEND to ${env.name} successful`);
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}))
	};
	await Promise.all(promises);
}

function tableFirst(a: string, b: string) {
	let aIsTable = a.endsWith('.TBL');
	let bIsTable = b.endsWith('.TBL');
	if (aIsTable && !bIsTable) {
		return -1;
	}
	else if (bIsTable && !aIsTable) {
		return 1;
	}
	return a.localeCompare(b);
}