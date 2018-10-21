import { Diagnostic, DiagnosticSeverity, DocumentRule, getTokens, Position, PslDocument, Range } from './api';

export class TodoInfo implements DocumentRule {

	ruleName = TodoInfo.name;

	report(pslDocument: PslDocument): Diagnostic[] {
		let todos: Todo[] = [];
		for (const token of pslDocument.parsedDocument.comments) {
			if (token.value.includes('TODO')) {
				const startLine = token.position.line;
				const startChar = token.position.character;
				todos = todos.concat(getTodosFromComment(token.value, startLine, startChar));
			}
		}
		return todos.map(todo => {
			const diagnostic = new Diagnostic(todo.range, todo.message, this.ruleName, DiagnosticSeverity.Information);
			diagnostic.source = 'TODO';
			return diagnostic;
		});
	}
}

interface Todo {
	range: Range;
	message: string;
}

function getTodosFromComment(commentText: string, startLine: number, startChar: number): Todo[] {
	let todos: Todo[] = [];
	let todo: Todo | undefined;
	let currentLine: number;
	let currentChar: number;

	const finalize = () => {
		if (!todo) return;
		const start = todo.range.start;
		const end = new Position(currentLine, todo.range.end.character + todo.message.trimRight().length);
		todo.range = new Range(start, end);
		todo.message = todo.message.trim().replace(/^:/gm, '').trim();
		if (!todo.message) todo.message = `TODO on line ${todo.range.start.line + 1}.`;
		todos.push(todo);
		todo = undefined;
	};

	const tokens = getTokens(commentText);
	for (const token of tokens) {
		currentLine = startLine + token.position.line;
		currentChar = startLine === currentLine ? token.position.character + startChar : token.position.character;
		if (token.isBlockCommentInit() || token.isLineCommentInit()) continue;
		else if (token.isBlockComment() || token.isLineComment()) {
			todos = todos.concat(getTodosFromComment(token.value, currentLine, currentChar));
		}
		else if (token.value === 'TODO' && !todo) {
			const range = new Range(currentLine, currentChar, currentLine, currentChar + 4);
			const message = '';
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
