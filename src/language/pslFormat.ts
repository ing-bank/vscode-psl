import * as vscode from 'vscode';
import * as parser from '../parser/parser';

export class PSLFormatProvider implements vscode.DocumentFormattingEditProvider {
	provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		let textEdits: vscode.TextEdit[] = [];
		return new Promise(resolve => {
			let p = new parser.Parser();
			p.parseDocument(document.getText());
			p.methods.forEach(method => {
				if (!method.closeParen) return;
				if (method.parameters.length < 2) return;
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

function buildText(method: parser.Method): string {
	let methodString = '';
	if (method.modifiers.length > 0) {
		methodString += method.modifiers.map(m => m.value).join(' ') + ' ';
	}

	methodString += `${method.id.value}(\n`;
	let parameterStrings: string[] = method.parameters.map(p => {
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
			parameterString += `\t// ${p.comment.value.trim()}`
		}
		return parameterString;
	})
	methodString += '\t\t  ' + parameterStrings.join('\n\t\t, ');
	methodString += '\n\t\t)'

	return methodString;
}