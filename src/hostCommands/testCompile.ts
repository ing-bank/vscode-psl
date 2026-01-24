import * as path from "node:path";

import * as fs from "fs-extra";
import * as vscode from "vscode";

import * as utils from "./hostCommandUtils.ts";
import { PSLDiagnostic } from "../common/diagnostics.ts";
import * as extension from "../extension.ts";
import * as environment from "../common/environment.ts";

const icon = utils.icons.TEST;

export async function testCompileHandler(context: utils.ExtensionCommandContext): Promise<void> {
	const ctx = utils.getFullContext(context);
	let diagnostics = [];
	if (ctx.mode === utils.ContextMode.FILE) {
		await testCompile(ctx.fsPath).catch(() => { });
	}
	else if (ctx.mode === utils.ContextMode.DIRECTORY) {
		const files = await vscode.window.showOpenDialog(
			{
				defaultUri: vscode.Uri.file(ctx.fsPath),
				canSelectMany: true,
				openLabel: "Test Compile"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			const result = await testCompile(fsPath).catch(() => { });
			if (result) diagnostics = diagnostics.concat(result);
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
				openLabel: "Test Compile"
			}
		);
		if (!files) return;
		for (const fsPath of files.map(file => file.fsPath)) {
			const result = await testCompile(fsPath);
			if (result) diagnostics = diagnostics.concat(result);
		}
	}
}

export async function testCompile(fsPath: string): Promise<boolean> {
	const fileStats = await fs.stat(fsPath);
	if (!fileStats.isFile()) {
		utils.logger.error(`${utils.icons.ERROR} ${icon} ${fsPath} is not a file.`);
		return true;
	}
	const textDocument = await vscode.workspace.openTextDocument(fsPath);
	if (!canTestCompileFile(textDocument, fsPath)) {
		// The error message for the specific error was already added in "canTestCompileFile"
		return true;
	}

	let testCompileSucceeded = false;
	let envs: environment.EnvironmentConfig[];
	try {
		envs = await utils.getEnvironment(fsPath);
	}
	catch {
		utils.logger.error(`${utils.icons.ERROR} ${icon} Invalid environment configuration.`);
		return true;
	}
	if (envs.length === 0) {
		utils.logger.error(`${utils.icons.ERROR} ${icon} No environments selected.`);
		return true;
	}
	const testCompiles: Promise<void>[] = [];
	for (const env of envs) {
		testCompiles.push(utils.executeWithProgress(
			`${icon} ${path.basename(fsPath)} TEST COMPILE`,
			async () => {
				await textDocument.save();
				utils.logger.info(
					`${utils.icons.WAIT} ${icon} ${path.basename(fsPath)}` +
					` TEST COMPILE in ${env.name}`
				);
				const connection = await utils.getConnection(env);
				let output = await connection.testCompile(fsPath);
				connection.close();
				const pslDiagnostics = parseCompilerOutput(output, textDocument);
				testCompileSucceeded = pslDiagnostics.filter(
					d => d.severity === vscode.DiagnosticSeverity.Error
				).length === 0;
				const testCompileWarning = pslDiagnostics.filter(
					d => d.severity === vscode.DiagnosticSeverity.Warning
				).length > 0;
				if (!testCompileSucceeded) {
					output = (
						`${utils.icons.ERROR} ${icon} ${path.basename(fsPath)}` +
						` TEST COMPILE in ${env.name} failed\n` + output
					);
				}
				else if (testCompileWarning) {
					output = (
						`${utils.icons.WARN} ${icon} ${path.basename(fsPath)} TEST COMPILE ` +
						`in ${env.name} succeeded with warning\n` + output
					);
				}
				else {
					output = (
						`${utils.icons.SUCCESS} ${icon} ${path.basename(fsPath)} ` +
						`TEST COMPILE in ${env.name} succeeded\n` + output
					);
				}
				utils.logger.info(output.split("\n").join("\n" + " ".repeat(20)));
				PSLDiagnostic.setDiagnostics(pslDiagnostics, env.name, fsPath);
			}
		).catch((e: Error) => {
			utils.logger.error(`${utils.icons.ERROR} ${icon} error in ${env.name} ${e.message}`);
		})
		);
	}
	return false;
}

function parseCompilerOutput(compilerOutput: string, document: vscode.TextDocument): PSLDiagnostic[] {
	/*
	ZFeatureToggleUtilities.PROC compiled at 15:31 on 29-05-17
    Source: ZFeatureToggleUtilities.PROC

    %PSL-E-SYNTAX: Missing #PROPERTYDEF
    In module: ZFeatureToggleUtilities

    Source: ZFeatureToggleUtilities.PROC
    	#PROPEYDEF dummy class = String private node = "dummy"
    %PSL-E-SYNTAX: Unexpected compiler command: PROPEYDEF
    At source code line: 25 in subroutine:

    Source: ZFeatureToggleUtilities.PROC

    %PSL-I-LIST: 2 errors, 0 warnings, 0 informational messages ** failed **
    In module: ZFeatureToggleUtilities
	*/
	const outputArrays: Array<PSLCompilerMessage> = splitCompilerOutput(compilerOutput);
	const pslDiagnostics: PSLDiagnostic[] = [];
	outputArrays.slice(0, outputArrays.length - 1).forEach(pslCompilerMessage => {

		const lineNumber: number = pslCompilerMessage.getLineNumber();
		if (lineNumber - 1 > document.lineCount || lineNumber <= 0) return;

		const codeLine: string = document.lineAt(lineNumber - 1).text;
		
		// returns the index of the first non-whitespace character
		let startIndex: number = codeLine.search(/\S/); 
		
		if (startIndex === -1) startIndex = 0; // codeLine is only whitespace characters
		const range = new vscode.Range(lineNumber - 1, startIndex, lineNumber - 1, codeLine.length);
		const severity = pslCompilerMessage.getSeverity();
		if (severity >= 0) {
			pslDiagnostics.push(
				new PSLDiagnostic(`${pslCompilerMessage.message}`, severity, document.fileName, range)
			);
		}
	});
	return pslDiagnostics;
}

function canTestCompileFile(document: vscode.TextDocument, fsPath: string): boolean {	
	let compilable: boolean = false;
	if (vscode.languages.match(extension.PSL_MODE, document)) {
		compilable = true;
	}
	else {
		let fileTypeDescription = "";
		if (vscode.languages.match(extension.BATCH_MODE, document)) {
			fileTypeDescription = "Batch";
		}
		else if (vscode.languages.match(extension.COL_MODE, document)) {
			fileTypeDescription = "Column Definition";
		}
		else if (vscode.languages.match(extension.DATA_MODE, document)) {
			fileTypeDescription = "Data File";
		}
		else if (vscode.languages.match(extension.SERIAL_MODE, document)) {
			fileTypeDescription = "Serialized Data";
		}
		else if (vscode.languages.match(extension.TBL_MODE, document)) {
			fileTypeDescription = "Table Definition";
		}
		else if (vscode.languages.match(extension.TRIG_MODE, document)) {			
			fileTypeDescription = "Trigger";
		}
		if (fileTypeDescription != "") {
			utils.logger.error(
				`${utils.icons.ERROR} ${icon} ${fileTypeDescription} ` +
				`${path.basename(fsPath)} cannot be test compiled.`
			);
		}
		else {
			utils.logger.error(`${utils.icons.ERROR} ${icon} ${path.basename(fsPath)} is not a PSL file.`);
		}
	}
	return compilable;
}

class PSLCompilerMessage {
	source: string;
	code: string;
	message: string;
	location: string;

	isFilled(): boolean {
		return (this.source && this.message && this.location) !== "";
	}
	getLineNumber(): number {
		if (this.location.startsWith("In module:")) return -1;
		return parseInt(this.location.replace("At source code line: ", "").split(" ")[0]);
	}
	getSeverity(): vscode.DiagnosticSeverity {
		if (this.message.startsWith("%PSL-W-")) {
			return vscode.DiagnosticSeverity.Warning;
		}
		else if (this.message.startsWith("%PSL-E-")) {
			return vscode.DiagnosticSeverity.Error;
		}
		else if (this.message.startsWith("%PSL-I-")) {
			return vscode.DiagnosticSeverity.Information;
		}
		// TODO: (Mischa Reitsma, 2025-07-25) Should we throw an error? There are more PSL severities. For now just Hint.
		return vscode.DiagnosticSeverity.Hint;
	}
}

function splitCompilerOutput(compilerOutput: string): Array<PSLCompilerMessage> {
	/**
	 * breaks apart the psl compiler output string into an arrays of compiler messages
	 */
	const outputArrays: Array<PSLCompilerMessage> = [];
	let compilerMessage: PSLCompilerMessage;

	const splitCompilerOutput = compilerOutput.replace(/\r/g, "").trim().split("\n");
	for (let i = 1; i < splitCompilerOutput.length; i++) {
		compilerMessage = new PSLCompilerMessage();
		compilerMessage.source = splitCompilerOutput[i];
		compilerMessage.code = splitCompilerOutput[i + 1];
		compilerMessage.message = splitCompilerOutput[i + 2];
		compilerMessage.location = splitCompilerOutput[i + 3];
		if (compilerMessage.isFilled()) outputArrays.push(compilerMessage);
		i = i + 4;
	}
	return outputArrays;
}
