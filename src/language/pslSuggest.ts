import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as utils from '../parser/utillities'
import { parseText, IMember } from '../parser/parser';

interface PSLCompletionItem extends vscode.CompletionItem {
	pslType: string
}


export class PSLCompletionItemProvider implements vscode.CompletionItemProvider {

	public async resolveCompletionItem(item: PSLCompletionItem): Promise<PSLCompletionItem> {
		if (item.pslType !== 'method') {
			let tableName = item.pslType;
			let columnName = item.label;
			let documentation = await RecordCompletion.getColumnDocumentation(tableName, columnName);
			item.detail = documentation.description;
			item.documentation = documentation.documentation;
		}
		else {
			let method = RecordCompletion.recordMethods.find(m => m.method === item.label);
			item.detail = method.method;
			item.documentation = method.comment;
		}
		return item;
	}

	public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<PSLCompletionItem[]> {
		let parsedDoc = parseText(document.getText());

		// get tokens on line and current token
		let result = utils.searchTokens(parsedDoc.tokens, position);
		if (!result) return [];
		let { tokensOnLine, index } = result;

		// parse line for dot completion
		let { reference, attribute } = utils.dotCompletion(tokensOnLine, index)
		if (!reference) return;

		// find parser member (method, declaration, etc) of reference
		let parserMember = utils.searchParser(parsedDoc, reference);
		if (!parserMember) return [];

		// Record completion
		if (parserMember.types[0].value.startsWith('Record')) {
			let columnName = ''
			if (attribute) columnName = attribute.value;
			return RecordCompletion.getCompletionItems(parserMember, columnName);
		}
	}
}

module RecordCompletion {

	export async function getCompletionItems(recordMember: IMember, columnName?: string): Promise<PSLCompletionItem[]> {
		let columns: PSLCompletionItem[] = await getColumnItems(recordMember.types[0].value);
		if (columnName) {
			columns = columns.filter(c => c.label.startsWith(columnName))
		}
		columns = columns.concat(recordMethods.map(m => { return { label: m.method, kind: vscode.CompletionItemKind.Method, pslType: 'method' } }))
		return columns;
	}

	async function getColumnItems(recordClass: String): Promise<PSLCompletionItem[]> {
		let tableName: string = recordClass.slice(6);
		if (vscode.workspace.rootPath) {
			let tableDefinitionPath = path.join(vscode.workspace.rootPath, 'dataqwik', 'table', tableName.toLowerCase());
			let colFiles = (await fsExtra.readdir(tableDefinitionPath)).filter((file: string) => { return file.endsWith('.COL'); })
			return colFiles.map(file => {
				let columnName = file.split(/\.|\-/)[1].toLowerCase();
				return { label: columnName, kind: vscode.CompletionItemKind.Field, pslType: file.split(/\.|\-/)[0] };
			});
		}
		else {
			return [];
		}
	}

	export async function getColumnDocumentation(tableName: string, columnName: string) {
		let contents = (await fsExtra.readFile(path.join(path.join(vscode.workspace.rootPath, 'dataqwik', 'table', tableName, tableName + '-' + columnName + '.COL')))).toString();
		let splitIndex = contents.toString().indexOf('}');
		return {
			'description': JSON.parse(contents.substr(0, splitIndex + 1))['DES'],
			'documentation': contents.substr(splitIndex + 1).trim()
		}
	}

	// hard-coded for now
	export const recordMethods = [
		{
			"method": "addLogComment",
			"comment": "Add an 'autolog' comment for a table"
		},
		{
			"method": "bypassSave",
			"comment": "Database save, bypass triggers"
		},
		{
			"method": "canSave",
			"comment": "Check if record can be saved"
		},
		{
			"method": "compare",
			"comment": "Compare and report differences"
		},
		{
			"method": "copy",
			"comment": "Copy Record object.  Loads any incremental load data to the object prior to copy."
		},
		{
			"method": "deserialize",
			"comment": "De-serialize a Record object from a string"
		},
		{
			"method": "fromArchive",
			"comment": "Check if record loaded from archive"
		},
		{
			"method": "getColumnChanges",
			"comment": "Return PslColumnChange instances for modified columns"
		},
		{
			"method": "getCurrVal",
			"comment": "Return Last Key Value for Bottom Key of target"
		},
		{
			"method": "getMode",
			"comment": "Return Record Mode"
		},
		{
			"method": "getPointer",
			"comment": "Return pointer to reference object"
		},
		{
			"method": "getStoredValue",
			"comment": "Return a process scope value from object"
		},
		{
			"method": "getTable",
			"comment": "Return table represented by this record"
		},
		{
			"method": "isChanged",
			"comment": "Check if the Column has Changed"
		},
		{
			"method": "isDefined",
			"comment": "Determine if a Record exists in the database"
		},
		{
			"method": "newInstance",
			"comment": "Return a new Record instance"
		},
		{
			"method": "overlay",
			"comment": "New record overlay fields "
		},
		{
			"method": "rebuildIndexes",
			"comment": "Rebuild specified indexes (MDB only)"
		},
		{
			"method": "restoreFrom",
			"comment": "Restore the instance's state from the input object."
		},
		{
			"method": "save",
			"comment": "Save a record to the database"
		},
		{
			"method": "serialize",
			"comment": "Serialize Record object to a string"
		},
		{
			"method": "setAuditFlag",
			"comment": "Set update history flag"
		},
		{
			"method": "setCreateOnly",
			"comment": "Allow create mode only"
		},
		{
			"method": "setCurrVal",
			"comment": "Enable currVal to resolve null key"
		},
		{
			"method": "setMode",
			"comment": "Set Record Mode"
		},
		{
			"method": "setNextVal",
			"comment": "Enable nextVal to resolve null key"
		},
		{
			"method": "setStoredValue",
			"comment": "Store a process scope value in an object"
		},
		{
			"method": "setUpdateOnly",
			"comment": "Allow update mode only"
		},
		{
			"method": "snapshot",
			"comment": "Make a snapshot of the current state of the Record object as it resides in memory. No additional forced loading of incrementally loaded data."
		},
		{
			"method": "throwError",
			"comment": "Throw a filer error"
		}
	]
}
