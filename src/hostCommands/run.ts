import * as vscode from 'vscode';
import * as utils from './hostCommandUtils';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as environment from '../common/environment';

const icon = utils.icons.RUN;

interface CustomRunContext {
	command: string;
	contextKey: string;
}

export const testContext: CustomRunContext = {
	command: 'runTest',
	contextKey: 'psl.runTestContext',
};

export const coverageContext: CustomRunContext = {
	command: 'runCoverage',
	contextKey: 'psl.runCoverageContext',
};

const customRunContexts = [testContext, coverageContext];

interface CustomTaskConfig {
	mrpcID: string;
	request: string;
	command: string;
}

export async function runPSLHandler(context: utils.ExtensionCommandContext): Promise<void> {
	handle(context);
}

export async function runTestHandler(context: utils.ExtensionCommandContext): Promise<void> {
	handle(context, testContext);
}

export async function runCoverageHandler(context: utils.ExtensionCommandContext): Promise<void> {
	handle(context, coverageContext);
}

async function handle(context: utils.ExtensionCommandContext, runContext?: CustomRunContext): Promise<void> {
	let c = utils.getFullContext(context);
	if (c.mode === utils.ContextMode.FILE) {
		return runPSL(c.fsPath, runContext).catch(() => { });
	}
	else if (c.mode === utils.ContextMode.DIRECTORY) {
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(c.fsPath), canSelectMany: true, openLabel: 'Run PSL' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath, runContext).catch(() => { });
		}
	}
	else {
		let quickPick = await environment.workspaceQuickPick();
		if (!quickPick) return;
		let chosenEnv = quickPick;
		let files = await vscode.window.showOpenDialog({ defaultUri: vscode.Uri.file(chosenEnv.fsPath), canSelectMany: true, openLabel: 'Run PSL' })
		if (!files) return;
		for (let fsPath of files.map(file => file.fsPath)) {
			await runPSL(fsPath, runContext).catch(() => { });
		}
	}
	return;
}

async function runPSL(fsPath: string, runContext?: CustomRunContext) {
	if (!fs.statSync(fsPath).isFile()) return
	const doc = await vscode.workspace.openTextDocument(fsPath);
	await doc.save();
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
			const connection = await utils.getConnection(env);
			let output: string;
			if (runContext) {
				const config = getFromConfiguration(doc.uri, runContext);
				if (config) {
					output = await connection.runCustom(fsPath, config.mrpcID, config.request);
				}
				else {
					throw new Error(`Invalid configuration for ${runContext.command}`);
				}
			}
			else {
				output = await connection.runPsl(fsPath);
			}
			connection.close();
			utils.logger.info(output.trim());
		}).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		}))
	}
	await Promise.all(promises);
}

function getFromConfiguration(uri: vscode.Uri, runContext: CustomRunContext): CustomTaskConfig | undefined {
	const configs = vscode.workspace.getConfiguration('psl', uri).get<CustomTaskConfig[]>('customTasks');
	const config = configs.find(c => c.command === runContext.command);
	if (!config || !config.mrpcID || !config.request) {
		return undefined;
	}
	return config;
}

export function registerCustomRunContext() {
	if (vscode.window.activeTextEditor) setCustomRunContext(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(setCustomRunContext);
}

export function setCustomRunContext(textEditor: vscode.TextEditor) {
	for (const context of customRunContexts) {
		let showCommand = false;
		if (textEditor) {
			if (getFromConfiguration(textEditor.document.uri, context)) showCommand = true;
		}
		vscode.commands.executeCommand('setContext', context.contextKey, showCommand);
	}
}
