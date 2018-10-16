import { Diagnostic, DiagnosticSeverity, Member, MemberClass, MemberRule,
	Method, MethodRule, Property, PropertyRule, PslDocument} from './api';

export class MethodStartsWithZ implements MethodRule {

	ruleName = MethodStartsWithZ.name;

	report(_parsedDocument: PslDocument, method: Method): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		startsWithZ(method, diagnostics, this.ruleName);

		return diagnostics;
	}
}
export class PropertyStartsWithZ implements PropertyRule {

	ruleName = PropertyStartsWithZ.name;

	report(_parsedDocument: PslDocument, property: Property): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		startsWithZ(property, diagnostics, this.ruleName)

		return diagnostics;
	}
}

export class PropertyIsDummy implements PropertyRule {

	ruleName = PropertyIsDummy.name;

	report(_parsedDocument: PslDocument, property: Property): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.isCalledDummy(property, diagnostics);

		return diagnostics;
	}

	isCalledDummy(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value === 'dummy' || member.id.value === 'DUMMY') {
			diagnostics.push(createDiagnostic(
				member, `property was called 'dummy'.`, DiagnosticSeverity.Information, this.ruleName
			));
		}
	}
}

export class MemberLiteralCase implements MemberRule {

	ruleName = MemberLiteralCase.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		this.checkUpperCase(member, diagnostics);
		return diagnostics;
	}
	checkUpperCase(member: Property, diagnostics: Diagnostic[]): void {
		if ((member.modifiers.findIndex(x => x.value === 'literal') > -1)) {
			if (member.id.value !== member.id.value.toUpperCase()) {
				diagnostics.push(createDiagnostic(
					member, 'is literal but not upper case.', DiagnosticSeverity.Information, this.ruleName
				));
			}
		}
	}
}

export class MemberCamelCase implements MemberRule {

	ruleName = MemberCamelCase.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
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

		const publicDeclartion = member.memberClass === MemberClass.declaration && member.modifiers.findIndex(
																					x => x.value === 'public') > -1;

		if (member.id.value.charAt(0) > 'z' || member.id.value.charAt(0) < 'a') {
			if (publicDeclartion) {
				const diagnostic = new Diagnostic(
					member.id.getRange(),
					`Declaration "${member.id.value}" is public and does not start with lower case.`,
					this.ruleName,
					DiagnosticSeverity.Information
				);
				diagnostic.source = 'lint';
				diagnostic.member = member;
				diagnostics.push(diagnostic);
			}
			else {
				diagnostics.push(createDiagnostic(
					member, 'does not start with lowercase.', DiagnosticSeverity.Information, this.ruleName
				));
			}
		}
	}
}

export class MemberLength implements MemberRule {

	ruleName = MemberLength.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.checkMemberLength(member, diagnostics)

		return diagnostics;
	}

	checkMemberLength(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.length > 25) {
			diagnostics.push(createDiagnostic(
				member, 'is longer than 25 characters.', DiagnosticSeverity.Warning, this.ruleName
			));
		}
	}

}
export class MemberStartsWithV implements MemberRule {

	ruleName = MemberStartsWithV.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		this.checkStartsWithV(member, diagnostics);

		return diagnostics;
	}

	checkStartsWithV(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.charAt(0) === 'v') {
			diagnostics.push(createDiagnostic(
				member, `starts with 'v'.`, DiagnosticSeverity.Warning, this.ruleName
			));
		}
	}
}

function createDiagnostic(
		member: Member,
		message: string,
		diagnosticSeverity: DiagnosticSeverity,
		ruleName: string
	): Diagnostic {

	const diagnostic = new Diagnostic(
		member.id.getRange(),
		`${printEnum(member.memberClass)} "${member.id.value}" ${message}`,
		ruleName,
		diagnosticSeverity
	);
	diagnostic.source = 'lint';
	diagnostic.member = member;
	return diagnostic;
}

function startsWithZ(member: Member, diagnostics: Diagnostic[], ruleName: string) {
	const firstChar = member.id.value.charAt(0);
	if (firstChar === 'z' || firstChar === 'Z') {
		diagnostics.push(createDiagnostic(
			member, `starts with '${firstChar}'.`, DiagnosticSeverity.Information, ruleName
		));
	}
}
function printEnum(memberClass: MemberClass): string {
	const enumName = MemberClass[memberClass];
	const capitalizedEnumName = enumName.charAt(0).toUpperCase() + enumName.slice(1);
	return enumName === 'method' ? 'Label' : capitalizedEnumName;
}
