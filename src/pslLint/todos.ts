import { Diagnostic, Range, Position, DiagnosticSeverity, DocumentRule, PslDocument, getTokens } from './api';

export class TodoInfo implements DocumentRule {

	ruleName = TodoInfo.name;

	report(pslDocument: PslDocument): Diagnostic[] {
		let todos: Todo[] = [];
		for (let token of pslDocument.parsedDocument.tokens) {
			let startLine = token.position.line;
			let startChar = token.position.character;
			if (token.isBlockComment() || token.isLineComment()) {
				todos = todos.concat(getTodosFromComment(token.value, startLine, startChar));
			}
		}
		return todos.map(todo => {
			let diagnostic = new Diagnostic(todo.range, todo.message, DiagnosticSeverity.Information);
			diagnostic.source = 'TODO';
			return diagnostic;
		})
	}
}

interface Todo {
	range: Range
	message: string
}

function getTodosFromComment(commentText: string, startLine: number, startChar: number): Todo[] {
	let todos: Todo[] = [];
	let todo: Todo | undefined;
	let currentLine: number;
	let currentChar: number;

	let finalize = () => {
		if (!todo) return;
		let start = todo.range.start;
		let end = new Position(currentLine, todo.range.end.character + todo.message.trimRight().length);
		todo.range = new Range(start, end);
		todo.message = todo.message.trim().replace(/^:/gm, '').trim();
		if (!todo.message) todo.message = `TODO on line ${todo.range.start.line + 1}.`;
		todos.push(todo);
		todo = undefined;
	}

	let tokens = getTokens(commentText);
	for (let token of tokens) {
		currentLine = startLine + token.position.line;
		currentChar = startLine === currentLine ? token.position.character + startChar : token.position.character;
		if (token.isBlockCommentInit() || token.isLineCommentInit()) continue;
		else if (token.isBlockComment() || token.isLineComment()) {
			todos = todos.concat(getTodosFromComment(token.value, currentLine, currentChar));
		}
		else if (token.value === 'TODO' && !todo) {
			let range = new Range(currentLine, currentChar, currentLine, currentChar + 4);
			let message = '';
			todo = { range, message };
		}
		else if (todo) {
			if (token.isNewLine()) finalize();
			else todo.message += token.value;
		}
	}
	if (todo) finalize();
	return todos;
}