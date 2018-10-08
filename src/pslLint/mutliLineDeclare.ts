import { MethodRule, PslDocument, Method, Diagnostic, DiagnosticSeverity, getTokens} from "./api";
import { Member, NON_TYPE_MODIFIERS } from "../parser/parser";

export class MultiLineDeclare implements MethodRule {

    ruleName = MultiLineDeclare.name;

	report(pslDocument: PslDocument, method: Method): Diagnostic[] {
        
        let diagnostics: Diagnostic[] = [];
        let prevDeclaration: Member;

        for (let i = 0; i < method.declarations.length; i++) {
            let reportAllVariables: boolean = false;
            let curDeclaration = method.declarations[i];
            let fullLine = pslDocument.getTextAtLine(curDeclaration.id.position.line);
            
            if ((((fullLine.indexOf("=") > fullLine.indexOf(",")) && (fullLine.indexOf(",") > -1)) || ((fullLine.indexOf(",") > fullLine.indexOf("=")) && (fullLine.indexOf("=") > -1))) && !(prevDeclaration && prevDeclaration.id.position.line === curDeclaration.id.position.line)) {
                let conditionOpen: boolean = false;
                let commaFound: boolean = false;
                let conditionClose: boolean = false;
                let typePresent: boolean = false;

                for (const token of getTokens(fullLine)) {
                    if (token.isTab()) continue;
                    if (token.isSpace()) continue;
                    if (token.isDoubleQuotes()) continue;
                    if (token.isSlash()) continue;
                    if ((token.value) === "type") {
                        typePresent = true;
                        continue;
                    }
                    if (NON_TYPE_MODIFIERS.indexOf(token.value) > -1) {
                        continue;
                    }
                    if (curDeclaration.types.map(t => t.value).indexOf(token.value) > -1) {
                        continue;
                    }
                    if (token.isOpenParen()) { 
                        conditionOpen = true;
                        conditionClose = false;
                        continue;
                    }
                    if ((conditionOpen) && (token.isCloseParen())) {
                        conditionClose = true;
                        continue;
                    }
                    if (token.isComma()) { 
                        commaFound = true;
                        continue;
                    }
                    if ((commaFound) && (token.isEqualSign()) && (typePresent) && (conditionOpen == conditionClose)) {
                        conditionOpen =  false;
                        conditionClose = false;
                        commaFound = false;
                        reportAllVariables =  true;
                    }
                }
            }
            if (reportAllVariables) { 
                let diag = new Diagnostic(curDeclaration.id.getRange(), `Multiple Declared and Valued variables are in the same line ${curDeclaration.id.value}`, this.ruleName, DiagnosticSeverity.Warning);
                diag.code = fullLine;
                diag.source = 'lint';
                diagnostics.push(diag); 
            }
        }
		return diagnostics;
    }
}
