import * as path from 'path';
import { Declaration, Member, Method, Parameter, ParsedDocument, Property } from './../parser/parser';
import { Position, Range } from './../parser/tokenizer';

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

export abstract class ProfileComponentRule {

	/**
	 * The rule name as it is known in the `psl-lint.json` configuration.
	 * This is automatically the same as the rule class name.
	 */
	readonly ruleName: string = this.constructor.name;

	/**
	 * The current component being checked.
	 */
	profileComponent: ProfileComponent;

	constructor(profileComponent: ProfileComponent) {
		this.profileComponent = profileComponent;
	}

	abstract report(...args: any[]): Diagnostic[];
}

export abstract class FileDefinitionRule extends ProfileComponentRule { }

export abstract class PslRule extends ProfileComponentRule {

	/**
	 * A parsed version of a PSL component.
	 */
	parsedDocument: ParsedDocument;

	constructor(profileComponent: ProfileComponent, parsedDocument: ParsedDocument) {
		super(profileComponent);
		this.parsedDocument = parsedDocument;
	}

}

/**
 * A rule that apply to a Property, Declaration, Parameter, or Method equally.
 */
export abstract class MemberRule extends PslRule {
	abstract report(member: Member): Diagnostic[];
}

/**
 * A rule that only apply to a Property.
 */
export abstract class PropertyRule extends PslRule {
	abstract report(property: Property): Diagnostic[];
}
/**
 * A rule that only apply to a Method.
 */
export abstract class MethodRule extends PslRule {
	abstract report(method: Method): Diagnostic[];
}
/**
 * A rule that only apply to a Parameter.
 */
export abstract class ParameterRule extends PslRule {
	abstract report(parameter: Parameter, method: Method): Diagnostic[];
}
/**
 * A rule that only apply to a Declaration.
 */
export abstract class DeclarationRule extends PslRule {
	abstract report(declaration: Declaration, method?: Method): Diagnostic[];
}

export type FileDefinitionRuleConstructor = new (profileComponent: ProfileComponent) => FileDefinitionRule;
export type ProfileComponentRuleConstructor = new (profileComponent: ProfileComponent) => ProfileComponentRule;
export type PslRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => PslRule;
export type MemberRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => MemberRule;
export type PropertyRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => PropertyRule;
export type MethodRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => MethodRule;
export type ParameterRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => ParameterRule;
export type DeclarationRuleConstructor = new (
	profileComponent: ProfileComponent,
	parsedDocument: ParsedDocument,
) => DeclarationRule;

type GetTextMethod = (lineNumber: number) => string;

/**
 * A ProfileComponent contains information about a file used in Profile.
 * The file may be PSL or non-PSL (such as a TBL or COL).
 */
export class ProfileComponent {
	/*
	* Utility method to check a path.
	*/
	static isPsl(fsPath: string): boolean {
		return path.extname(fsPath) === '.PROC'
			|| path.extname(fsPath) === '.BATCH'
			|| path.extname(fsPath) === '.TRIG'
			|| path.extname(fsPath).toUpperCase() === '.PSL';
	}
	/*
	* Utility method to check a path.
	*/
	static isFileDefinition(fsPath: string): boolean {
		return path.extname(fsPath) === '.TBL'
			|| path.extname(fsPath) === '.COL';
	}
	/*
	* Utility method to check a path.
	*/
	static isProfileComponent(fsPath: string): boolean {
		return ProfileComponent.isPsl(fsPath)
			|| ProfileComponent.isFileDefinition(fsPath);
	}

	/**
	 * The path on the file system to the component.
	 */
	fsPath: string;

	/**
	 * The text contents of the component.
	 */
	textDocument: string;

	private indexedDocument?: Map<number, string>;

	constructor(fsPath: string, textDocument: string, getTextAtLine?: GetTextMethod) {
		this.textDocument = textDocument;
		this.fsPath = fsPath;
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

	/**
	 * Converts a zero-based offset to a position.
	 *
	 * @param offset A zero-based offset.
	 * @return A valid [position](#Position).
	 */
	positionAt(offset: number): Position {
		const before = this.textDocument.slice(0, offset);
		const newLines = before.match(/\n/g);
		const line = newLines ? newLines.length : 0;
		const preCharacters = before.match(/(\n|^).*$/g);
		return new Position(line, preCharacters ? preCharacters[0].length : 0);
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
