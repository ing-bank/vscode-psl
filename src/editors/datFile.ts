import * as path from 'path';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import DatPreview from './datPreview';
import { previewManager } from './previewManager';
import * as utils from './utilityFunctions';

export function activate(context: ExtensionContext) {

	// Preview .DAT File Command
	const datCommand = commands.registerCommand('psl.datPreview', (arg) => {
		let resource: Uri;
		if (arg instanceof Uri) {
			resource = arg;
		} else {
			if (window.activeTextEditor) {
				resource = window.activeTextEditor.document.uri;
			} else {
				window.showInformationMessage('Open a DAT file first to show a preview.');
				return;
			}
		}
		const dat = resource.with({
			scheme: 'dat-preview',
		});

		const viewColumn = utils.getViewColumn();
		let preview = previewManager.find(dat);
		if (preview && !preview.isDisposed()) {
			preview.reveal();
			return preview.webview;
		}

		// Check if the file to be previewed has a header
		const tableName = path.basename(resource.fsPath, '.DAT').toLowerCase();
		let workspacePath = workspace.getWorkspaceFolder(resource).uri.fsPath;

		// Go up the directory structure until the base "Profile" directory is reached
		if (workspacePath.includes('Profile')) {
			while (!path.basename(workspacePath).includes('Profile')) {
				workspacePath = path.dirname(workspacePath);
			}
		}

		// Look in the Profile Host project for a table directory having the same name as the .DAT file
		const tableDirPath = path.join(workspacePath, 'dataqwik', 'table', tableName);

		utils.existsReadableFileAsync(tableDirPath)
			.then(() => {
				// The table directory exists, proceed with the check
				let contents: string;
				let files: string[];

				// Perform parallel reads of the .DAT file and the table directory
				Promise.all([utils.readFileAsync(resource.fsPath), utils.readDirAsync(tableDirPath)])
					.then((results) => {
						[contents, files] = results;

						// Build a list containing the values from the first row of the file
						const separator: string = utils.getLineSeparator(contents);
						const datFileColumns: string[] = contents.split(separator)[0].split('\t');

						// Build a list containing all .COL files in the table directory
						let tableColumns: string[] = files.filter(file => file.endsWith('.COL'));
						tableColumns = tableColumns.map(file => file.split('.')[0].split('-')[1]);

						// Build a list containing all columns missing from the .DAT file header
						const missingColumns: string[] = [];
						for (const col of tableColumns) {
							if (!datFileColumns.includes(col)) {
								missingColumns.push(col);
							}
						}

						// Build an object for tracking whether columns are computed or not
						const computedObject: object = {};
						for (const col of tableColumns) {
							computedObject[col] = utils.isComputedColumn(tableDirPath, tableName, col);
						}

						let totalUncomputed: number = 0;
						let missingUncomputed: number = 0;
						const uncomputedColumns: string[] = [];

						// Compute the total of uncomputed columns
						for (const key in computedObject) {
							if (!computedObject[key]) {
								totalUncomputed++;
								uncomputedColumns.push(key);
							}
						}

						// Compute the total of missing uncomputed columns
						for (const col of missingColumns) {
							if (!computedObject[col]) {
								missingUncomputed++;
							}
						}

						// If all uncomputed columns are missing, then the header must be added
						if (totalUncomputed === missingUncomputed) {
							preview = new DatPreview(context, resource, viewColumn, uncomputedColumns);
						} else {
							preview = new DatPreview(context, resource, viewColumn);
						}

						return preview.webview;
					})
					.catch((err) => {
						// The .DAT file or the table directory could not be read, open the preview
						window.showWarningMessage(err.message);

						preview = new DatPreview(context, resource, viewColumn);
						return preview.webview;
					});
			})
			.catch(() => {
				// The table directory does not exist, inform the user that the check cannot be performed and open the preview
				window.showWarningMessage(tableName + ' could not be found in the Profile Host project. ' +
											'Header existence could not be analysed');
				preview = new DatPreview(context, resource, viewColumn);
				return preview.webview;
			});
	});

	// Clear State Command
	const clearCommand = commands.registerCommand('psl.datClearState', () => {
		const preview = previewManager.active();
		if (preview) {
			const key = preview.previewUri.toString();
			if (preview.storage.get(key)) {
				preview.storage.update(key, null);
				preview.refresh(preview.getOptions());
			}
		}
	});

	// Refresh Command
	const refreshCommand = commands.registerCommand('psl.datRefresh', () => {
		const preview = previewManager.active();
		if (preview) {
			preview.webview.postMessage({
				refresh: true,
			});
		}
		preview.refresh(preview.options);
	});

	// Register the commands
	context.subscriptions.push(datCommand);
	context.subscriptions.push(clearCommand);
	context.subscriptions.push(refreshCommand);

	workspace.onDidSaveTextDocument(document => {
		if (utils.isDatFile(document)) {
			const resource = document.uri;
			const uri = resource.with({
				scheme: 'dat-preview',
			});
			const preview = previewManager.find(uri);
			if (preview) {
				preview.refresh(preview.getOptions());
			}
		}
	});

	workspace.onDidChangeTextDocument(args => {
		if (utils.isDatFile(args.document)) {
			const resource = args.document.uri;
			const uri = resource.with({
				scheme: 'dat-preview',
			});
			const preview = previewManager.find(uri);
			if (preview && args.contentChanges.length > 0) {
				preview.refresh(preview.getOptions());
			}
		}
	});

	workspace.onDidChangeConfiguration(() => {
		previewManager.configure();
	});

	workspace.onDidOpenTextDocument(document => {
		if (utils.isStdinFile(document)) {
			commands.executeCommand('psl.datPreview', document.uri);
		}
	});

	if (window.activeTextEditor) {
		const document = window.activeTextEditor.document;
		if (utils.isStdinFile(document)) {
			commands.executeCommand('psl.datPreview', document.uri);
		}
	}
}
