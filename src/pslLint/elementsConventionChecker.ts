import { Diagnostic, DiagnosticSeverity, PslDocument, Member, MemberRule, MemberClass, Property, PropertyRule, MethodRule, Method } from './api';

export class MethodStartsWithZ implements MethodRule {

	ruleName = MethodStartsWithZ.name;

	report(_parsedDocument: PslDocument, method: Method): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		startsWithZ(method, diagnostics)

		return diagnostics
	}
}
export class PropertyStartsWithZ implements PropertyRule {

	ruleName = PropertyStartsWithZ.name;

	report(_parsedDocument: PslDocument, property: Property): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		startsWithZ(property, diagnostics)

		return diagnostics
	}
}

export class PropertyLiteralCase implements PropertyRule {

	ruleName = PropertyLiteralCase.name;

	report(_parsedDocument: PslDocument, property: Property): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		this.checkUpperCase(property, diagnostics);
		return diagnostics;
	}
	checkUpperCase(property: Property, diagnostics: Diagnostic[]): void {
		if ((property.modifiers.findIndex(x => x.value === 'literal') > -1)) {
			if (property.id.value !== property.id.value.toUpperCase()) {
				diagnostics.push(createDiagnostic(property, 'is literal but not upper case.'));
			}
		}
	}
}

export class MemberCamelCase implements MemberRule {

	ruleName = MemberCamelCase.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		this.memberCase(member, diagnostics)

		return diagnostics;
	}

	memberCase(member: Member, diagnostics: Diagnostic[]): void {
		const isLiteralProperty = (member.memberClass === MemberClass.property) &&
			(member.modifiers.findIndex(x => x.value === 'literal') > -1);
		let isStaticDeclaration = false

		member.types.forEach(type => {
			if (type.value === member.id.value) {
				isStaticDeclaration = true
			}
		});


		if (member.id.value.charAt(0) > 'z' || member.id.value.charAt(0) < 'a') {
			// exception for literal properties
			if (isLiteralProperty || isStaticDeclaration) return;
			if (member.memberClass === MemberClass.method) {
				let method = member as Method;
				if (method.batch) return;
			}
			diagnostics.push(createDiagnostic(member, 'does not start with lowercase.'));
		}
	}
}

export class MemberLength implements MemberRule {

	ruleName = MemberLength.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		this.checkMemberLength(member, diagnostics)

		return diagnostics;
	}

	checkMemberLength(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.length > 25) {
			diagnostics.push(createDiagnostic(member, 'is longer than 25 characters.'));
		}
	}


}
export class MemberStartsWithV implements MemberRule {

	ruleName = MemberStartsWithV.name;

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		this.checkStartsWithV(member, diagnostics)

		return diagnostics;
	}

	checkStartsWithV(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.charAt(0) == 'v') {
			diagnostics.push(createDiagnostic(member, `starts with 'v'.`));
		}
	}
}

function createDiagnostic(member: Member, message: String): Diagnostic {
	let diagnostic = new Diagnostic(member.id.getRange(), `${printEnum(member.memberClass)} "${member.id.value}" ${message}`, DiagnosticSeverity.Warning);
	diagnostic.source = 'lint';
	diagnostic.member = member;
	return diagnostic;
}

function startsWithZ(member: Member, diagnostics: Diagnostic[]) {
	const firstChar = member.id.value.charAt(0)
	if (firstChar == 'z' || firstChar == 'Z') {
		diagnostics.push(createDiagnostic(member, `starts with '${firstChar}'.`));
	}
}
function printEnum(memberClass: MemberClass): String {
	const enumName = MemberClass[memberClass];
	const capitalizedEnumName = enumName.charAt(0).toUpperCase() + enumName.slice(1);
	return enumName === 'method' ? 'Label' : capitalizedEnumName;
}

