import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as parser from '../parser/parser';
import * as utils from '../parser/utilities';
import * as jsonc from 'jsonc-parser';

export interface Documentation {
	code: string;
	markdown: string;
}

export const relativeCorePath = '.vscode/pslcls/';
export const relativeProjectPath = ['dataqwik/procedure/', 'test/psl/utgood/', 'test/psl/stgood/'];
export const relativeTablePath = 'dataqwik/table/';

export async function getDocumentation(result: utils.FinderResult, tableDirectory: string): Promise<Documentation> {
	let { fsPath, member } = result;
	if (!member) {
		// handle tables here
		if (fsPath.endsWith('.TBL')) {
			let text = await getWorkspaceDocumentText(fsPath);
			let parsed = jsonc.parse(text);
			let doc = text.split('}')[1];
			let tableName = path.basename(fsPath).split('.')[0];

			return { code: '(table) ' + tableName, markdown: `${parsed.DES}\n\n${doc}` };
		}
	}
	else if (member.memberClass === parser.MemberClass.column) {
		let typs = {
			'T': ['String', 'column type: T (Text)'],
			'U': ['String', 'column type: U (Uppercase text)'],
			'N': ['Number', 'column type: N (Number)'],
			'$': ['Number', 'column type: $ (Currency)'],
			'L': ['Boolean', 'column type: L (Logical)'],
			'D': ['Date', 'column type: D (Date)'],
			'C': ['Number', 'column type: C (Time)'],
			'F': ['Number', 'column type: F (Frequency)'],
			'M': ['String', 'column type: M (Memo)'],
			'B': ['String', 'column type: B (Blob)'],
		}
		let text = await getWorkspaceDocumentText(fsPath);
		let parsed = jsonc.parse(text);
		let typ = parsed.TYP;
		let doc = text.split('}')[1];

		return {
			code: `(column) ${typs[typ][0]} ${member.id.value}`,
			markdown: `${parsed.DES}\n\n${typs[typ][1]}\n\n${doc}`
		}
	}
	else if (member.memberClass === parser.MemberClass.method) {
		let method = member as parser.Method

		let sig = `${method.modifiers.map(i => i.value).join(' ')} ${method.id.value}`;
		let argString: string = method.parameters.map((param: parser.Parameter) => `${param.types[0].value} ${param.id.value}`).join('\n\u200B , ');
		let code = '';
		if (method.parameters.length === 0) code = `${sig}(${argString})`;
		else code = `${sig}(\n\u200B \u200B \u200B ${argString}\n\u200B )`;
		let markdown = method.documentation ? method.documentation : '';
		return { code, markdown };
	}
	else {
		let code = '';

		if (member.types.length === 0) code = `void ${member.id.value}`;
		else if (member.types.length === 1) {
			if (member.types[0] === member.id) code = `static ${member.id.value}`
			else code = `${member.types[0].value} ${member.id.value}`
		}
		else {
			code = `${member.types[0].value} ${member.id.value}( ${member.types.slice(1).map((t: any) => t.value).join(', ')})`
		}

		switch (member.memberClass) {
			case parser.MemberClass.declaration:
				code = ' type ' + code;
				break;
			case parser.MemberClass.parameter:
				code = '(parameter) ' + code;
				break;
			case parser.MemberClass.property:
				code = ' #PROPERTYDEF ' + code;
				break;
			default:
				return;
		}

		let markdown = result.member.documentation ? result.member.documentation : '';

		if (member.types[0].value.startsWith('Record')) {
			let tableName = member.types[0].value.replace('Record', '');
			let tableLocation = path.join(tableDirectory, tableName.toLowerCase(), tableName.toUpperCase() + '.TBL');
			let text = await getWorkspaceDocumentText(tableLocation);
			let parsed = jsonc.parse(text);
			let doc = text.split('}')[1];

			markdown = `${parsed.DES}\n\n${doc}`;
		}
		return { code, markdown };
	}

}

export async function getWorkspaceDocumentText(fsPath: string): Promise<string> {
	return fs.stat(fsPath).then(() => {
		return vscode.workspace.openTextDocument(fsPath).then(textDocument => textDocument.getText(), () => '');
	}).catch(() => '')
}
