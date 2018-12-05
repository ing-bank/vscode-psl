import * as fs from 'fs-extra';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { Token } from '../parser/tokenizer';
import * as utils from '../parser/utilities';

export interface Documentation {
	code: string;
	markdown: string;
}

export const relativeCorePath = '.vscode/pslcls/';
export const relativeProjectPath = ['dataqwik/procedure/', 'test/psl/utgood/', 'test/psl/stgood/'];
export const relativeTablePath = 'dataqwik/table/';

export async function getDocumentation(result: utils.FinderResult, tableDirectory: string): Promise<Documentation> {
	const { fsPath, member } = result;
	if (!member) {
		// handle tables here
		if (fsPath.endsWith('.TBL')) {
			const text = await getWorkspaceDocumentText(fsPath);
			const parsed = jsonc.parse(text);
			const doc = text.split('}')[1];
			const tableName = path.basename(fsPath).split('.')[0];

			return { code: '(table) ' + tableName, markdown: `${parsed.DES}\n\n${doc}` };
		}
	}
	else if (member.memberClass === parser.MemberClass.column) {
		const typs = {
			$: ['Number', 'column type: $ (Currency)'],
			B: ['String', 'column type: B (Blob)'],
			C: ['Number', 'column type: C (Time)'],
			D: ['Date', 'column type: D (Date)'],
			F: ['Number', 'column type: F (Frequency)'],
			L: ['Boolean', 'column type: L (Logical)'],
			M: ['String', 'column type: M (Memo)'],
			N: ['Number', 'column type: N (Number)'],
			T: ['String', 'column type: T (Text)'],
			U: ['String', 'column type: U (Uppercase text)'],
		};
		const text = await getWorkspaceDocumentText(fsPath);
		const parsed = jsonc.parse(text);
		const typ = parsed.TYP;
		const doc = text.split('}')[1];

		return {
			code: `(column) ${typs[typ][0]} ${member.id.value}`,
			markdown: `${parsed.DES}\n\n${typs[typ][1]}\n\n${doc}`,
		};
	}
	else if (member.memberClass === parser.MemberClass.method) {
		const method = member as parser.Method;

		const sigArray: Token[] = [...method.modifiers, method.types[0], method.id];
		const sig: string = sigArray.filter(Boolean).map(t => t.value).join(' ');
		const argString: string = method.parameters
			.map(param => `${param.types[0].value} ${param.id.value}`)
			.join('\n\u200B , ');
		let code = '';
		if (method.parameters.length === 0) code = `${sig}(${argString})`;
		else code = `${sig}(\n\u200B \u200B \u200B ${argString}\n\u200B )`;
		const markdown = method.documentation ? method.documentation : '';
		return { code, markdown };
	}
	else {
		let code = '';

		if (member.types.length === 0) code = `void ${member.id.value}`;
		else if (member.types.length === 1) {
			if (member.types[0] === member.id) code = `static ${member.id.value}`;
			else code = `${member.types[0].value} ${member.id.value}`;
		}
		else {
			code = `${member.types[0].value} ${member.id.value}( ${member.types.slice(1).map((t: any) => t.value).join(', ')})`;
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
			const tableName = member.types[0].value.replace('Record', '');
			const tableLocation = path.join(tableDirectory, tableName.toLowerCase(), tableName.toUpperCase() + '.TBL');
			const text = await getWorkspaceDocumentText(tableLocation);
			const parsed = jsonc.parse(text);
			const doc = text.split('}')[1];

			markdown = `${parsed.DES}\n\n${doc}`;
		}
		return { code, markdown };
	}

}

export async function getWorkspaceDocumentText(fsPath: string): Promise<string> {
	return fs.stat(fsPath).then(() => {
		return vscode.workspace.openTextDocument(fsPath).then(textDocument => textDocument.getText(), () => '');
	}).catch(() => '');
}
