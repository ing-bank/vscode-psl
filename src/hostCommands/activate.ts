import * as path from 'path';
import * as vscode from 'vscode';

import { compileAndLinkHandler } from './compileAndLink';
import { getElementHandler, getTableHandler } from './get';

import { refreshElementHandler, refreshTableHandler } from './refresh';
import { runPSLHandler } from './run';
import {
	coverageContext, registerCustomRunContext, runCoverageHandler,
	runTestHandler, testContext,
} from './runCustom';
import { sendElementHandler, sendTableHandler } from './send';
import { testCompileHandler } from './testCompile';

const PROFILE_ELEMENTS = [
	'.FKY',
	'.G',
	'.IDX',
	'.JFD',
	'.M',
	'.m',
	'.PPL',
	'.properties',
	'.PROPERTIES',
	'.PSLX',
	'.pslx',
	'.PSLXTRA',
	'.pslxtra',
	'.PSQL',
	'.psql',
	'.QRY',
	'.RPT',
	'.SCR',
];

export function activate(context: vscode.ExtensionContext) {

	registerProfileElementContext();
	registerCustomRunContext();

	const commands = [
		{ id: 'psl.getElement', callback: getElementHandler },
		{ id: 'psl.getTable', callback: getTableHandler },
		{ id: 'psl.refreshElement', callback: refreshElementHandler },
		{ id: 'psl.sendElement', callback: sendElementHandler },
		{ id: 'psl.testCompile', callback: testCompileHandler },
		{ id: 'psl.compileAndLink', callback: compileAndLinkHandler },
		{ id: 'psl.runPSL', callback: runPSLHandler },
		{ id: 'psl.sendTable', callback: sendTableHandler },
		{ id: 'psl.refreshTable', callback: refreshTableHandler },
		// Custom commands
		// { id: 'psl.getCompiledCode', callback: getCompiledCodeHandler },
		{ id: `psl.${testContext.command}`, callback: runTestHandler },
		{ id: `psl.${coverageContext.command}`, callback: runCoverageHandler },
	];

	for (const command of commands) {
		context.subscriptions.push(
			vscode.commands.registerCommand(
				command.id, command.callback,
			),
		);
	}
}

function registerProfileElementContext() {
	if (vscode.window.activeTextEditor) setIsProfileElementContext(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(setIsProfileElementContext);
}

function setIsProfileElementContext(textEditor: vscode.TextEditor) {
	let isElement: boolean = false;
	if (textEditor) {
		isElement = PROFILE_ELEMENTS.indexOf(path.extname(textEditor.document.fileName)) >= 0;
	}
	vscode.commands.executeCommand('setContext', 'psl.isProfileElement', isElement);
}
