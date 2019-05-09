import * as vscode from 'vscode';
import * as environment from './environment';

let terminal: vscode.Terminal | undefined;

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.launchHostTerminal', launchHostTerminal
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepIn', stepIn
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepOut', stepOut
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepOver', stepOver
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.sendToHostTerminal', sendToHostTerminal
		)
	);

	vscode.window.onDidCloseTerminal(cleanTerminal);

	terminalSendSettings();

}

async function terminalSendSettings() {
	let pslTerminalCommands = ['psl.stepIn', 'psl.stepOut', 'psl.stepOver', 'psl.sendToHostTerminal'];
	let terminalSettings = vscode.workspace.getConfiguration('terminal');
	let commandsToSkip: string[] | undefined = terminalSettings.get('integrated.commandsToSkipShell');
	if (commandsToSkip) {
		let merged = commandsToSkip.concat(pslTerminalCommands);
		let filteredMerge = merged.filter((item, pos) => merged.indexOf(item) === pos);
		terminalSettings.update('integrated.commandsToSkipShell', filteredMerge, true);
	}
}

function cleanTerminal(someTerminal: vscode.Terminal) {
	if (someTerminal === terminal) {
		terminal.dispose();
		terminal = undefined;
		vscode.commands.executeCommand('setContext', 'psl.hasHostTerminal', false);
	}
}


async function getLaunchLogins() {
	if (!vscode.workspace.workspaceFolders) {
		throw new Error('No configuration present.');
	}
	let logins: environment.LaunchQuickPick[] = []
	let allEnvironments = await environment.GlobalFile.read();
	for (let env of allEnvironments.environments) {
		let login: environment.LaunchQuickPick;
		try {
			let label = env.sshLogin ? `${env.sshLogin}@${env.host}` : `${env.host}`
			login = {env, description: env.name, label};
			logins.push(login)
		}
		catch (e) {
			continue;
		}
	}
	return logins;
}

async function launchHostTerminal() {
	if (!terminal) {
		let launchLogins = await getLaunchLogins();
		let choice: environment.LaunchQuickPick;
		if (launchLogins.length === 1) choice = launchLogins[0];
		else {
			choice = await vscode.window.showQuickPick(getLaunchLogins());
			if (!choice) return;
		}
		let sshLogin;
		let host;
		try {
			let envObj = choice.env
			sshLogin = envObj.sshLogin;
			if (!sshLogin) {
				sshLogin = await vscode.window.showInputBox({prompt: 'username'});
			}
			if (!sshLogin) return;
			host = envObj.host;
		}
		catch (e) {
			// alertInvalid(choice.fsPath);
			vscode.window.showErrorMessage('Invalid environment configuration.')
			return;
		}
		terminal = vscode.window.createTerminal(host);
		terminal.sendText(`ssh ${sshLogin}@${host}`);
		vscode.commands.executeCommand('setContext', 'psl.hasHostTerminal', true);
	}
	terminal.show();
}

function stepIn() {
	terminalSend('ZSTEP INTO:"W $ZPOS ZP @$ZPOS B"');
}

function stepOut() {
	terminalSend('ZSTEP OUTOF:"W $ZPOS ZP @$ZPOS B"');
}

function stepOver() {
	terminalSend('ZSTEP OVER:"W $ZPOS ZP @$ZPOS B"');
}

function sendToHostTerminal(text: string) {
	terminalSend(text);
}

function terminalSend(text: string) {
	const activeTerminal: vscode.Terminal | undefined = vscode.window.activeTerminal;
	if (activeTerminal) {
		activeTerminal.show();
		activeTerminal.sendText(text, true);
	}
}
