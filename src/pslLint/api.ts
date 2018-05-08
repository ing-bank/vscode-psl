import { IDocument, parseFile, parseText, IDeclaration, IMember, MemberClass, IMethod, IProperty, IParameter } from './../parser/parser';
import { Range } from './../parser/tokenizer'

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

/**
 * An interface for writing new rules
 */
export interface Rule {
	/**
	 * 
	 * @param parsedDocument An abstract representation of a PSL document
	 * @param textDocument The whole text of the document, as a string.
	 */
	report(parsedDocument: Document, textDocument: string, ...args: any[]): Diagnostic[];
}

export interface MethodRule extends Rule {
	report(parsedDocument: Document, textDocument: string, method: IMethod): Diagnostic[];
}

export interface DeclarationRule extends Rule {
	report(parsedDocument: Document, textDocument: string, declaration: IDeclaration): Diagnostic[];
}

export class Document {

	parsedDocument: IDocument;

	constructor(parsedDocument: IDocument) {
		this.parsedDocument = parsedDocument;
	}

	/**
	 * A utility method to get the text at a specified line of the document.
	 * @param lineNumber The zero-based line number of the document where the text is.
	 */
	getTextAtLine(lineNumber: number) {
		return this.parsedDocument.tokens.filter(t => {
			return t.position.line === lineNumber;
		}).map(t => t.value).join('');
	}
}

export { parseFile, parseText, IDeclaration, IMember, MemberClass, IMethod, IProperty, IParameter };
export * from './../parser/tokenizer';
export * from './../parser/utillities';