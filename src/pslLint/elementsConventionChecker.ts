import { Diagnostic, DiagnosticSeverity, Rule, IDocument, IMember } from './api';

export class ElementsConventionChecker implements Rule {
	report(parsedDocument: IDocument): Diagnostic[] {
		let diagnostics:Diagnostic[] = [];
		//check properties
		parsedDocument.properties.forEach(property => {
			//literal
			if (property.modifiers.findIndex(x => x.value === "literal") > -1){
				//check upper case
				if(property.id.value!==property.id.value.toUpperCase()){
					diagnostics.push(this.createDiagnostic(property,"is not upper case"));
				}
			}
			//Non-literal property names should start as lowercase
			else if(property.id.value.charAt(0) > 'z' || property.id.value.charAt(0) < 'a') {
				diagnostics.push(this.createDiagnostic(property,"doesn't start with lowercase"));
			}
			//25 characters in length
			if (property.id.value.length > 25) {
				diagnostics.push(this.createDiagnostic(property,"has more than 25 characters"));
			}
			//Property names should avoid starting with "Z" or "z" to provide safe names for extending classes for customization.
			if (property.id.value.charAt(0) == 'z' || property.id.value.charAt(0) == 'Z') {
				diagnostics.push(this.createDiagnostic(property,`starts with 'Z'. (Property names should avoid starting with "Z" or "z" to provide safe names for extending classes for customization. )`));
			}
		});
		//check declaration
		parsedDocument.methods.forEach(method => {
			//25 characters in length
			if (method.id.value.length > 25) {
				diagnostics.push(this.createDiagnostic(method,"has more than 25 characters"));
			}
			//should start as lowercase
			if (method.id.value.charAt(0) > 'z' || method.id.value.charAt(0) < 'a') {
				diagnostics.push(this.createDiagnostic(method,"doesn't start with lowercase"));
			}
			//Method names must not start with lowercase "v", which is reserved for PSL-generated code.
			if (method.id.value.charAt(0) == 'v') {
				diagnostics.push(this.createDiagnostic(method,`starts with 'v'. (Method names must not start with lowercase "v", which is reserved for PSL-generated code.)`));
			}
			//Method names should avoid starting with "Z" or "z" to provide safe names for extending classes for customization
			if (method.id.value.charAt(0) == 'z' || method.id.value.charAt(0) == 'Z') {
				diagnostics.push(this.createDiagnostic(method,`starts with 'Z'. (Method names should avoid starting with "Z" or "z" to provide safe names for extending classes for customization. )`));
			}
		});
		//check variable
		parsedDocument.declarations.forEach(declaration => {
			//25 characters in length
			if (declaration.id.value.length > 25) {
				diagnostics.push(this.createDiagnostic(declaration,"has more than 25 characters"));
			}
			//Variable names must not start with lowercase "v", which is reserved for PSL-generated code.
			if (declaration.id.value.charAt(0) == 'v') {
				diagnostics.push(this.createDiagnostic(declaration,`starts with 'v'. (Variable names must not start with lowercase "v", which is reserved for PSL-generated code.)`));
			}
		});
		return diagnostics;
	}

	private createDiagnostic(member: IMember, message :String): Diagnostic{
		let diagnostic = new Diagnostic(member.id.getRange(), "["+member.memberClass+"]"+member.id.value + " -> " + message , DiagnosticSeverity.Warning);
		diagnostic.source = 'lint';
		return diagnostic;
	}
}

