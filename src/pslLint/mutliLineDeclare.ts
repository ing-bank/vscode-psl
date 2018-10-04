import { MethodRule, PslDocument, Method, Diagnostic, DiagnosticSeverity} from "./api";

export class MultiLineDeclare implements MethodRule {

    ruleName = MultiLineDeclare.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {
        
        let diagnostics: Diagnostic[] = [];

        for (let i = 0; i < method.declarations.length; i++) {
            let curDeclaration = method.declarations[i];
            let fullLine = pslDocument.getTextAtLine(curDeclaration.id.position.line);
            if ((((fullLine.indexOf("=") > fullLine.indexOf("//")) && (fullLine.indexOf("//") > -1)) && (((fullLine.indexOf("=") > fullLine.indexOf(",")) && (fullLine.indexOf(",") > -1)) || ((fullLine.indexOf(",") > fullLine.indexOf("=")) && (fullLine.indexOf("=") > -1)))) {
                let diag = new Diagnostic(curDeclaration.id.getRange(), `Multiple Declared and Valued variables are in the same line ${curDeclaration.id.value}`, this.ruleName, DiagnosticSeverity.Warning);
                diag.code = fullLine;
                diag.source = 'lint';
                diagnostics.push(diag);
            }
        }
		return diagnostics;
    }
}
