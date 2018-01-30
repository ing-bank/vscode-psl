import * as vscode from 'vscode';
import * as path from 'path';

import { commands, ExtensionContext, TextEditor, window } from 'vscode';
import { getElementHandler, getTableHandler } from './get';
import { refreshElementHandler, refreshTableHandler } from './refresh';
import { testCompileHandler } from './testCompile';
import { compileAndLinkHandler } from './compileAndLink';
import { sendElementHandler, sendTableHandler } from './send';
import { runPSLHandler } from './run';

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
	'.SCR'
]

export function activate(context: ExtensionContext) {

	registerProfileElementContext();

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.getElement', getElementHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.getTable', getTableHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.refreshElement', refreshElementHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.sendElement', sendElementHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.testCompile', testCompileHandler
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.compileAndLink', compileAndLinkHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.runPSL', runPSLHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.hostCommandDialog', hostCommandHandler
		)
	);

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand(
	// 		'psl.testSendLink', testSendLinkHandler
	// 	)
	// );

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.sendTable', sendTableHandler
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.refreshTable', refreshTableHandler
		)
	);

}


// async function testSendLinkHandler (context: utils.ExtensionCommandContext): Promise<void> {
// 	let c = utils.getFullContext(context);
// 	if (c.mode === utils.ContextMode.FILE) {
// 		let success = await testCompileHandler(context);
// 		if (success) {
// 			await sendElementHandler(context);
// 			await compileAndLinkHandler(context);
// 		}
// 	}
// 	else {
// 		let fileUris = await vscode.window.showOpenDialog({canSelectMany: true, openLabel: 'Test Send Link'})
// 		if (!fileUris) return;
// 		let successFiles: string[] = await fileUris.map(uri => uri.fsPath)
// 			.filter(async fsPath => (await fs.lstat(fsPath)).isFile())

// 		successFiles = await successFiles.filter(async fsPath => {
// 				let success = await testCompileHandler({fsPath, dialog: false})
// 				return success;
// 			})

// 		for (let fsPath of successFiles) {
// 			await sendElementHandler({fsPath, dialog: false});
// 		}

// 		for (let fsPath of successFiles) {
// 			await compileAndLinkHandler({fsPath, dialog: false});
// 		}
// 	}
// }

export async function hostCommandHandler() {
	let choice = await vscode.window.showQuickPick([
		{label: `$(sync)\tRefresh from Host`, description: '', handler: refreshElementHandler},
		{label: `$(arrow-down)\tGet from Host`, description: '', handler: getElementHandler},
		{label: `$(database)\tTable Get from Host`, description: '', handler: getTableHandler},
		{label: `$(arrow-up)\tSend to Host`, description: '', handler: sendElementHandler},
		{label: `$(link)\tCompile and Link`, description: '', handler: compileAndLinkHandler},
		{label: `$(gear)\tTest Compile`, description: '', handler: testCompileHandler},
		{label: `$(triangle-right)\tRun PSL`, description: '', handler: runPSLHandler}
		// {label: `$(ellipsis)\tTest Send Link`, description: '', handler: testSendLinkHandler},
	], {
		placeHolder: 'Select a command to open a dialog'
	});
	if (!choice) return;
	choice.handler({dialog: true, fsPath: ''});
}

function registerProfileElementContext() {
	if (window.activeTextEditor) setIsProfileElementContext(window.activeTextEditor)
	window.onDidChangeActiveTextEditor(setIsProfileElementContext)
}

function setIsProfileElementContext(textEditor: TextEditor) {
	let isElement: boolean = false;
	if (textEditor) {
		isElement = PROFILE_ELEMENTS.indexOf(path.extname(textEditor.document.fileName)) >= 0;
	}
	commands.executeCommand('setContext', 'psl.isProfileElement', isElement)
}