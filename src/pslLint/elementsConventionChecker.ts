import { Member, MemberClass, Method, Property } from 'psl-parser';
import {
	Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, MemberRule,
	MethodRule, PropertyRule,
} from './api';

export class MethodStartsWithZ extends MethodRule {

	report(method: Method): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		startsWithZ(method, diagnostics, this.ruleName);

		return diagnostics;
	}
}
export class PropertyStartsWithZ extends PropertyRule {

	report(property: Property): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		startsWithZ(property, diagnostics, this.ruleName);

		return diagnostics;
	}
}

export class PropertyIsDummy extends PropertyRule {

	report(property: Property): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		if (!this.parsedDocument.extending) {
			this.isCalledDummy(property, diagnostics);
		}
		return diagnostics;
	}

	isCalledDummy(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.toLowerCase() === 'dummy') {
			diagnostics.push(
				createDiagnostic(member, 'Usage of "dummy" property is discouraged', DiagnosticSeverity.Information, this.ruleName),
			);
		}
	}
}

export class PropertyIsDuplicate extends PropertyRule {

	report(property: Property): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		this.isDuplicateProperty(property, diagnostics);
		return diagnostics;
	}

	isDuplicateProperty(property: Property, diagnostics: Diagnostic[]): void {

		const slicedProperty = this.parsedDocument.properties.slice(0,
			this.parsedDocument.properties.findIndex(x => x.id.position.line === property.id.position.line));

		for (const checkProperty of slicedProperty) {

			if (checkProperty.id.value === property.id.value) {
				const diagnostic = new Diagnostic(
					property.id.getRange(),
					`Property "${property.id.value}" is already declared.`,
					this.ruleName,
					DiagnosticSeverity.Warning,
				);
				const aboveDuplicateProperty = new DiagnosticRelatedInformation(
					checkProperty.id.getRange(),
					`Reference to property "${checkProperty.id.value}".`,
				);
				diagnostic.relatedInformation = [
					aboveDuplicateProperty,
				];
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
				break;
			}

			if (checkProperty.id.value.toLowerCase() === property.id.value.toLowerCase()) {
				const diagnostic = new Diagnostic(
					property.id.getRange(),
					`Property "${property.id.value}" is already declared with different case.`,
					this.ruleName,
					DiagnosticSeverity.Warning,
				);
				const aboveDuplicateProperty = new DiagnosticRelatedInformation(
					checkProperty.id.getRange(),
					`Reference to property "${checkProperty.id.value}".`,
				);
				diagnostic.relatedInformation = [
					aboveDuplicateProperty,
				];
				diagnostic.source = 'lint';
				diagnostics.push(diagnostic);
				break;
			}
		}
	}
}

export class MemberLiteralCase extends MemberRule {

	report(member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		this.checkUpperCase(member, diagnostics);
		return diagnostics;
	}
	checkUpperCase(member: Property, diagnostics: Diagnostic[]): void {
		if ((member.modifiers.findIndex(x => x.value === 'literal') > -1)) {
			if (member.id.value !== member.id.value.toUpperCase()) {
				diagnostics.push(
					createDiagnostic(member, 'is literal but not upper case.', DiagnosticSeverity.Warning, this.ruleName),
				);
			}
		}
	}
}

export class MemberCamelCase extends MemberRule {

	report(member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.memberCase(member, diagnostics);

		return diagnostics;
	}

	memberCase(member: Member, diagnostics: Diagnostic[]): void {
		const isLiteral = (member.modifiers.findIndex(x => x.value === 'literal') > -1);
		let isStaticDeclaration = false;

		member.types.forEach(type => {
			if (type.value === member.id.value) {
				isStaticDeclaration = true;
			}
		});

		// exception for variables starting with percentage
		if (member.id.value.charAt(0) === '%') return;
		// exception for literal properties
		if (isLiteral || isStaticDeclaration) return;

		if (member.memberClass === MemberClass.method) {
			const method = member as Method;
			if (method.batch) return;
		}

		if (member.id.value.charAt(0) > 'z' || member.id.value.charAt(0) < 'a') {
			if (isPublicDeclaration(member)) {
				const diagnostic = new Diagnostic(
					member.id.getRange(),
					`Declaration "${member.id.value}" is public and does not start with lower case.`,
					this.ruleName,
					DiagnosticSeverity.Information,
				);
				diagnostic.source = 'lint';
				diagnostic.member = member;
				diagnostics.push(diagnostic);
			}
			else {
				diagnostics.push(createDiagnostic(
					member,
					'does not start with lowercase.',
					DiagnosticSeverity.Warning,
					this.ruleName,
				));
			}
		}
	}
}

export class MemberLength extends MemberRule {

	report(member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.checkMemberLength(member, diagnostics);

		return diagnostics;
	}

	checkMemberLength(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.length > 25) {
			diagnostics.push(createDiagnostic(
				member,
				'is longer than 25 characters.',
				DiagnosticSeverity.Warning,
				this.ruleName,
			));
		}
	}
}
export class MemberStartsWithV extends MemberRule {

	report(member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.checkStartsWithV(member, diagnostics);

		return diagnostics;
	}

	checkStartsWithV(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.charAt(0) !== 'v') return;
		if (isPublicDeclaration(member)) {
			diagnostics.push(createDiagnostic(
				member,
				`is public and starts with 'v'.`,
				DiagnosticSeverity.Information,
				this.ruleName,
			));
		}
		else {
			diagnostics.push(createDiagnostic(member, `starts with 'v'.`, DiagnosticSeverity.Warning, this.ruleName));
		}
	}
}

function createDiagnostic(
	member: Member,
	message: string,
	diagnosticSeverity: DiagnosticSeverity,
	ruleName: string,
): Diagnostic {
	const diagnostic = new Diagnostic(
		member.id.getRange(),
		`${printEnum(member.memberClass)} "${member.id.value}" ${message}`,
		ruleName,
		diagnosticSeverity,
	);
	diagnostic.source = 'lint';
	diagnostic.member = member;
	return diagnostic;
}

function startsWithZ(member: Member, diagnostics: Diagnostic[], ruleName: string) {
	const firstChar = member.id.value.charAt(0);
	if (firstChar === 'z' || firstChar === 'Z') {
		diagnostics.push(createDiagnostic(
			member,
			`starts with '${firstChar}'.`,
			DiagnosticSeverity.Information,
			ruleName,
		));
	}
}
function printEnum(memberClass: MemberClass): string {
	const enumName = MemberClass[memberClass];
	const capitalizedEnumName = enumName.charAt(0).toUpperCase() + enumName.slice(1);
	return enumName === 'method' ? 'Label' : capitalizedEnumName;
}

function isPublicDeclaration(member: Member) {
	const isPublic = member.modifiers.findIndex(x => x.value === 'public') > -1;
	return member.memberClass === MemberClass.declaration && isPublic;
}
