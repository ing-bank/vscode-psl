import {
	Declaration, Member, MemberClass, Method, NON_TYPE_MODIFIERS,
	Parameter, ParsedDocument, parseFile, parseText, Property,
} from './../parser/parser';
import { Range, Token } from './../parser/tokenizer';

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
	Hint = 3,
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
	source?: string;

	/**
	 * The severity, default is [error](#DiagnosticSeverity.Error).
	 */
	severity?: DiagnosticSeverity;

	/**
	 * A code or identifier for this diagnostics. Will not be surfaced
	 * to the user, but should be used for later processing, e.g. when
	 * providing [code actions](#CodeActionContext).
	 */
	code?: string | number;

	ruleName: string;

	/**
	 * An array of related diagnostic information, e.g. when symbol-names within
	 * a scope collide all definitions can be marked via this property.
	 */
	relatedInformation?: DiagnosticRelatedInformation[];

	member?: Member;

	/**
	 * Creates a new diagnostic object.
	 *
	 * @param range The range to which this diagnostic applies.
	 * @param message The human-readable message.
	 * @param severity The severity, default is [error](#DiagnosticSeverity.Error).
	 */
	constructor(range: Range, message: string, ruleName: string, severity?: DiagnosticSeverity, member?: Member) {
		this.range = range;
		this.message = message;
		this.ruleName = ruleName;
		if (severity) this.severity = severity;
		if (member) this.member = member;
	}
}

/**
 * Represents a related message and source code location for a diagnostic. This should be
 * used to point to code locations that cause or related to a diagnostics, e.g when duplicating
 * a symbol in a scope.
 */
export class DiagnosticRelatedInformation {

	/**
	 * The range of this related diagnostic information.
	 */
	range: Range;

	/**
	 * The message of this related diagnostic information.
	 */
	message: string;

	/**
	 * Creates a new related diagnostic information object.
	 *
	 * @param range The range.
	 * @param message The message.
	 */
	constructor(range: Range, message: string) {
		this.range = range;
		this.message = message;
	}
}

export interface ProfileComponentRule {

	ruleName: string;

	/**
	 * @param profileComponent An object containing genearal information about a Profile component
	 */
	report(profileComponent: ProfileComponent, ...args: any[]): Diagnostic[];
}
export type PslRule = ProfileComponentRule;

export interface MemberRule extends PslRule {
	report(profileComponent: ProfileComponent, member: Member): Diagnostic[];
}

export interface PropertyRule extends PslRule {
	report(profileComponent: ProfileComponent, property: Property): Diagnostic[];
}

export interface MethodRule extends PslRule {
	report(profileComponent: ProfileComponent, method: Method): Diagnostic[];
}

export interface ParameterRule extends PslRule {
	report(profileComponent: ProfileComponent, parameter: Parameter, method: Method): Diagnostic[];
}

export interface DeclarationRule extends PslRule {
	report(profileComponent: ProfileComponent, declaration: Declaration, method?: Method): Diagnostic[];
}

type GetTextMethod = (lineNumber: number) => string;

/**
 * A ProfileComponent contains information about a file used in Profile.
 * The file may be PSL or non-PSL (such as a TBL or COL).
 *
 * The path on the filesystem is available, as well as the components's text contents.
 * In the case where the component is PSL, the parsedDocument property is defined.
 */
export class ProfileComponent {

	fsPath: string;
	textDocument: string;
	parsedDocument?: ParsedDocument;

	private indexedDocument?: Map<number, string>;

	constructor(fsPath: string, textDocument: string, parsedDocument?: ParsedDocument, getTextAtLine?: GetTextMethod) {
		this.textDocument = textDocument;
		this.fsPath = fsPath;
		if (parsedDocument) this.parsedDocument = parsedDocument;
		if (getTextAtLine) this.getTextAtLine = getTextAtLine;
	}

	/**
	 * A utility method to get the text at a specified line of the document.
	 * @param lineNumber The zero-based line number of the document where the text is.
	 */
	getTextAtLine(lineNumber: number): string {
		if (lineNumber < 0) {
			throw new Error('Cannot get text at negative line number.');
		}
		if (!this.indexedDocument) {
			this.indexedDocument = this.createIndexedDocument();
		}
		return this.indexedDocument.get(lineNumber) || '';
	}

	getCommentsOnLine(lineNumber: number): Token[] {
		if (!this.parsedDocument) return [];
		return this.parsedDocument.comments.filter(t => {
			return t.position.line === lineNumber;
		});
	}

	private createIndexedDocument(): Map<number, string> {
		const indexedDocument = new Map();
		let line: string = '';
		let index: number = 0;
		for (const char of this.textDocument) {
			line += char;
			if (char === '\n') {
				indexedDocument.set(index, line);
				index++;
				line = '';
			}
		}
		return indexedDocument;
	}
}

export { parseFile, parseText, Declaration, Member, MemberClass, Method, NON_TYPE_MODIFIERS, Property, Parameter };
export * from './../parser/tokenizer';
export * from '../parser/utilities';
