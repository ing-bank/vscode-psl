import { Diagnostic, DiagnosticSeverity, PslDocument, Member, MemberRule, MemberClass, Property, PropertyRule, MethodRule, Method } from './api';
export class MethodConventionChecker implements MethodRule {
	report(_parsedDocument: PslDocument, method: Method): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		startsWithZ(method,diagnostics)

		return diagnostics
	}
}
export class PropertyConventionChecker implements PropertyRule {
	report(_parsedDocument: PslDocument, property: Property): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];

		this.checkNonLiteralCase(property,diagnostics)
		startsWithZ(property,diagnostics)

		return diagnostics
	}

	checkNonLiteralCase(property: Property, diagnostics: Diagnostic[]): void {
		if (!(property.modifiers.findIndex(x => x.value === "literal") > -1)){
			if(property.id.value.charAt(0) > 'z' || property.id.value.charAt(0) < 'a') {
					diagnostics.push(createDiagnostic(property,"doesn't start with lowercase"));
				}	
		}
	}
}
export class MemberConventionChecker implements MemberRule {

	report(_parsedDocument: PslDocument, member: Member): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
	
		this.memberCase(member, diagnostics)
		this.checkMemberLength(member, diagnostics)
		this.checkStartsWithV(member, diagnostics)

		return diagnostics;
	}
	memberCase(member: Member, diagnostics: Diagnostic[]): void {
		const isLiteralProperty = (member.memberClass === MemberClass.property) &&
			(member.modifiers.findIndex(x => x.value === "literal") > -1);

		if (member.id.value.charAt(0) > 'z' || member.id.value.charAt(0) < 'a') {
			// exception for literal properties
			if (isLiteralProperty) return;
			diagnostics.push(createDiagnostic(member, "doesn't start with lowercase"));
		}
	}

	checkMemberLength(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.length > 25) {
			diagnostics.push(createDiagnostic(member, "has more than 25 characters"));
		}
	}

	checkStartsWithV(member: Member, diagnostics: Diagnostic[]): void {
		if (member.id.value.charAt(0) == 'v') {
			diagnostics.push(createDiagnostic(member, `starts with 'v'. (must not start with lowercase "v", which is reserved for PSL-generated code.)`));
		}
	}
}

function createDiagnostic(member: Member, message: String): Diagnostic {
	let diagnostic = new Diagnostic(member.id.getRange(), `${printEnum(member.memberClass)} ${member.id.value} ${message}`, DiagnosticSeverity.Warning);
	diagnostic.source = 'lint';
	return diagnostic;
}

function startsWithZ(member: Member, diagnostics: Diagnostic[]) {
	if (member.id.value.charAt(0) == 'z' || member.id.value.charAt(0) == 'Z') {
		diagnostics.push(createDiagnostic(member, `starts with 'Z'. (should avoid starting with "Z" or "z" to provide safe names for extending classes for customization. )`));
	}
}
function printEnum(memberClass: MemberClass): String {
	let enumName = MemberClass[memberClass];
	return enumName.charAt(0).toUpperCase() + enumName.slice(1); //capitalize
}

