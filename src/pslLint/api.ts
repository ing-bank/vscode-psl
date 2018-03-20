import { IDocument, parseFile, parseText, IDeclaration, IMember, MemberClass, IMethod, IProperty, IParameter } from './../parser/parser';

export enum DiagnosticSeverity {

	/**
	 * Something not allowed by the rules of a language or other means.
	 */
	Error = 0,

	/**
	 * Something suspicious but allowed.
	 */
	Warning = 1,

	/**
	 * Something to inform about but not a problem.
	 */
	Information = 2,

	/**
	 * Something to hint to a better way of doing it, like proposing
	 * a refactoring.
	 */
	Hint = 3
}

export class Diagnostic {

	/**
	 * The range to which this diagnostic applies.
	 */
	range: Range;

	/**
	 * The human-readable message.
	 */
	message: string;

	/**
	 * A human-readable string describing the source of this
	 * diagnostic, e.g. 'typescript' or 'super lint'.
	 */
	source: string;

	/**
	 * The severity, default is [error](#DiagnosticSeverity.Error).
	 */
	severity: DiagnosticSeverity;

	/**
	 * A code or identifier for this diagnostics. Will not be surfaced
	 * to the user, but should be used for later processing, e.g. when
	 * providing [code actions](#CodeActionContext).
	 */
	code: string | number;

	/**
	 * Creates a new diagnostic object.
	 *
	 * @param range The range to which this diagnostic applies.
	 * @param message The human-readable message.
	 * @param severity The severity, default is [error](#DiagnosticSeverity.Error).
	 */
	constructor(range: Range, message: string, severity?: DiagnosticSeverity) {
		this.range = range
		this.message = message
		this.severity = severity
	}


}

export class Range {

	/**
	 * The start position. It is before or equal to [end](#Range.end).
	 */
	readonly start: Position;

	/**
	 * The end position. It is after or equal to [start](#Range.start).
	 */
	readonly end: Position;

	/**
	 * Create a new range from two positions. If `start` is not
	 * before or equal to `end`, the values will be swapped.
	 *
	 * @param start A position.
	 * @param end A position.
	 */
	constructor(start: Position, end: Position);

	/**
	 * Create a new range from number coordinates. It is a shorter equivalent of
	 * using `new Range(new Position(startLine, startCharacter), new Position(endLine, endCharacter))`
	 *
	 * @param startLine A zero-based line value.
	 * @param startCharacter A zero-based character value.
	 * @param endLine A zero-based line value.
	 * @param endCharacter A zero-based character value.
	 */
	constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);

	constructor(a, b, c?, d?) {
		if (typeof a === 'number' && typeof b == 'number' && typeof c == 'number' && typeof d == 'number') {
			this.start = new Position(a, b);
			this.end = new Position(c, d);
		}
		else {
			this.start = a;
			this.end = b;
		}
	}

}

export class Position {

	/**
	 * The zero-based line value.
	 */
	readonly line: number;

	/**
	 * The zero-based character value.
	 */
	readonly character: number;

	/**
	 * @param line A zero-based line value.
	 * @param character A zero-based character value.
	 */
	constructor(line: number, character: number) {
		this.line = line;
		this.character = character;
	}
}


/**
 * An interface for writing new rules
 */
export interface Rule {
	/**
	 * 
	 * @param parsedDocument An abstract representation of a PSL document
	 * @param textDocument The whole text of the document, as a string.
	 */
	report(parsedDocument: IDocument, textDocument: string, ...args: any[]): Diagnostic[];
}

export interface MethodRule extends Rule {
	report(parsedDocument: IDocument, textDocument: string, method: IMethod): Diagnostic[];
}

export interface DeclarationRule extends Rule {
	report(parsedDocument: IDocument, textDocument: string, declaration: IDeclaration): Diagnostic[];
}

export { IDocument, parseFile, parseText, IDeclaration, IMember, MemberClass, IMethod, IProperty, IParameter };
export * from './../parser/tokenizer';