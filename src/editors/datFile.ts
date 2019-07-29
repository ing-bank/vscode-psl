import { commands, ExtensionContext, extensions, Uri, WebviewPanelSerializer, 
		WebviewPanel, window, workspace } from 'vscode';
import * as utils from './utilityFunctions';

export function activate(context: ExtensionContext) {

    // Preview .DAT File Command
	const datCommand = commands.registerCommand('dat.preview', (arg) => {
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
		let tableName = path.basename(resource.fsPath, '.DAT').toLowerCase();

		// Get the Workspace corresponding to the resource
		let workspacePath = workspace.getWorkspaceFolder(resource).uri.fsPath;

		// Go up the directory structure until the base "Profile_Host" directory is reached
		if (workspacePath.includes("Profile")) {
			while (!path.basename(workspacePath).includes("Profile")) {
				workspacePath = path.dirname(workspacePath);
			}
		}

		// Look in the Profile Host project for a table directory having the same name as the .DAT file
		let tableDirPath = path.join(workspacePath, 'dataqwik', 'table', tableName);
		
		utils.existsReadableFileAsync(tableDirPath)
			.then(() => {
				// The table directory exists, proceed with the check
				let contents : string;
				let files : string[];

				// Perform parallel reads of the .DAT file and the table directory
				Promise.all([utils.readFileAsync(resource.fsPath), utils.readDirAsync(tableDirPath)])
					.then((results) => {
						[contents, files] = results;

						// Build a list containing the values from the first row of the file
						let separator : string = utils.getLineSeparator(contents);
						let datFileColumns : string[] = contents.split(separator)[0].split("\t");

						// Build a list containing all .COL files in the table directory
						let tableColumns : string[] = files.filter(file => file.endsWith(".COL"));
						tableColumns = tableColumns.map(file => file.split(".")[0].split("-")[1]);

						// Build a list containing all columns missing from the .DAT file header
						let missingColumns : string[] = [];
						for (let i = 0; i < tableColumns.length; i++) {
							if (!datFileColumns.includes(tableColumns[i])) {
								missingColumns.push(tableColumns[i]);
							}
						}

						// Build an object for tracking whether columns are computed or not
						let computedObject: object = {};
						for (let i = 0; i < tableColumns.length; i++) {
							computedObject[tableColumns[i]] = utils.isComputedColumn(tableDirPath, tableName, tableColumns[i]);
						}

						let totalUncomputed: number = 0, missingUncomputed: number = 0;
						let uncomputedColumns: string[] = [];

						// Compute the total of uncomputed columns
						for (let key in computedObject) {
							if (!computedObject[key]) {
								totalUncomputed++;
								uncomputedColumns.push(key);
							}
						}

						// Compute the total of missing uncomputed columns
						for (let i = 0; i < missingColumns.length; i++) {
							if (!computedObject[missingColumns[i]]) {
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
			.catch((err) => {
				// The table directory does not exist, inform the user that the check cannot be performed and open the preview
				window.showWarningMessage(tableName + " could not be found in the Profile Host project. Header existence cannot be analysed");

				preview = new DatPreview(context, resource, viewColumn);
				return preview.webview;
			});

	});
}
