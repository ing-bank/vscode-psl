import * as vscode from 'vscode';
import * as parser from '../parser/parser';
import { PSL_MODE } from '../extension';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			PSL_MODE, new PSLFormatProvider()
		)
	);

}

export class PSLFormatProvider implements vscode.DocumentFormattingEditProvider {
	provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		let textEdits: vscode.TextEdit[] = [];
		return new Promise(resolve => {
			let p = parser.parseText(document.getText());
			p.methods.forEach(method => {
				if (!method.closeParen) return;
				method.memberClass
				let methodLine = method.id.position.line;
				let closePosition = method.closeParen.position;
				let methodRange = new vscode.Range(methodLine, 0, closePosition.line, closePosition.character + 1)
				textEdits.push(new vscode.TextEdit(methodRange, buildText(method)));
			})
			resolve(textEdits);
		})
	}
}

interface Param {
	parameter: string
	comment: string
}

function buildText(method: parser.IMethod): string {
	let methodString = '';
	if (method.modifiers.length > 0) {
		methodString += method.modifiers.map(m => m.value).join(' ') + ' ';
	}

	methodString += `${method.id.value}(`;
	let parameterStrings: Param[] = method.parameters.map(p => {
		let param = {parameter: '', comment: ''}
		let parameterString = '';
		if (p.req) {
			parameterString += 'req ';
		}
		if (p.ret) {
			parameterString += 'ret ';
		}
		if (p.literal) {
			parameterString += 'literal ';
		}
		parameterString += p.types[0].value + ' ' + p.id.value;
		if (p.types.length > 1) {
			parameterString += `( ${p.types.map(t => t.value).slice(1).join(', ')})`;
		}
		if (p.comment) {
			param.comment = `\t// ${p.comment.value.trim()}`
		}
		param.parameter = parameterString
		return param;
	})
	if (parameterStrings.length === 0) {
		methodString += ')';
	}
	else if (parameterStrings.length === 1) {
		methodString += parameterStrings[0].parameter + ')' + parameterStrings[0].comment;
	}
	else {
		methodString += '\n\t\t  ' + parameterStrings.map(p => p.parameter + p.comment).join('\n\t\t, ');
		methodString += '\n\t\t)'
	}

	return methodString;
}