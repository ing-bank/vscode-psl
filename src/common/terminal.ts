import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepIn', stepIn,
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepOut', stepOut,
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.stepOver', stepOver,
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'psl.sendToHostTerminal', sendToHostTerminal,
		),
	);
	terminalSendSettings();

	configureGtmDebug(context);
}

async function terminalSendSettings() {
	const pslTerminalCommands = ['psl.stepIn', 'psl.stepOut', 'psl.stepOver', 'psl.sendToHostTerminal'];
	const terminalSettings = vscode.workspace.getConfiguration('terminal');
	const commandsToSkip: string[] | undefined = terminalSettings.get('integrated.commandsToSkipShell');
	if (commandsToSkip) {
		const merged = commandsToSkip.concat(pslTerminalCommands);
		const filteredMerge = merged.filter((item, pos) => merged.indexOf(item) === pos);
		terminalSettings.update('integrated.commandsToSkipShell', filteredMerge, true);
	}
}

function stepIn() {
	terminalSend('ZSTEP INTO:"W $ZPOS,! ZP @$ZPOS B"');
}

function stepOut() {
	terminalSend('ZSTEP OUTOF:"W $ZPOS,! ZP @$ZPOS B"');
}

function stepOver() {
	terminalSend('ZSTEP OVER:"W $ZPOS,! ZP @$ZPOS B"');
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

function configureGtmDebug(context: vscode.ExtensionContext) {
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 901);
	const commandName = 'psl.setGtmDebug';
	let gtmDebug = vscode.workspace.getConfiguration('psl').get('gtmDebugEnabled');

	const set = () => {
		if (gtmDebug) showInformation(context);
		statusBar.text = `GT.M Debug ${gtmDebug ? '$(check)' : '$(circle-slash)'}`;
		vscode.commands.executeCommand('setContext', 'psl.gtmDebug', gtmDebug);
	};

	set();
	context.subscriptions.push(
		vscode.commands.registerCommand(
			commandName, () => {
				gtmDebug = !gtmDebug;
				set();
			},
		),
	);

	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('psl.gtmDebugEnabled')) {
			gtmDebug = true;
			set();
		}
	});

	statusBar.command = commandName;
	statusBar.tooltip = 'GT.M Debug hotkeys';
	statusBar.show();
}

async function showInformation(context: vscode.ExtensionContext) {
	const doNotShow = context.globalState.get('gtmDebugShow');
	if (doNotShow) return;
	const response = await vscode.window.showInformationMessage(
		'INTO Ctrl+Q | OVER Ctrl+W | OUTOF Ctrl+E',
		'Do not show again',
	);
	if (response) {
		context.globalState.update('gtmDebugShow', true);
	}
}
