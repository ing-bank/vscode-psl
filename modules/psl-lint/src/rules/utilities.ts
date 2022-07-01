import { ParsedDocument, Token } from "psl-parser";

export function getCommentsOnLine(parsedDocument: ParsedDocument, lineNumber: number): Token[] {
	return parsedDocument.comments.filter(t => {
		return t.position.line === lineNumber;
	});
}
