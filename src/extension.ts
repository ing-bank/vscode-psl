import * as vscode from 'vscode';

import * as terminal from './common/terminal';
import * as hostEnvironment from './common/environment';
import * as hostCommands from './hostCommands/activate';
import * as languageFeatures from './language/activate';

export const PSL_MODE: vscode.DocumentFilter = { language: 'psl', scheme: 'file' };
export const BATCH_MODE: vscode.DocumentFilter = { language: 'profileBatch', scheme: 'file' };
export const TRIG_MODE: vscode.DocumentFilter = { language: 'profileTrigger', scheme: 'file' };
export const DATA_MODE: vscode.DocumentFilter = { language: 'profileData', scheme: 'file' };
export const SERIAL_MODE: vscode.DocumentFilter = { language: 'profileSerialData', scheme: 'file'};
export const TBL_MODE: vscode.DocumentFilter = { language: 'profileTable', scheme: 'file' };
export const COL_MODE: vscode.DocumentFilter = { language: 'profileColumn', scheme: 'file' };


export function activate(context: vscode.ExtensionContext) {

	hostCommands.activate(context);

	hostEnvironment.activate(context);

	terminal.activate(context);

	languageFeatures.activate(context);
}


// this method is called when your extension is deactivated
export function deactivate() {
}
