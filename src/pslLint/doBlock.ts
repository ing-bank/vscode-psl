import { PslRule, Diagnostic, DiagnosticSeverity } from "./api";
import { SyntaxKind, Statement } from "../parser";


// if x do {
// }

// if x do y

export class RedundantDoStatement extends PslRule {

    report(): Diagnostic[] {
        // for (const statement of this.parsedDocument.statements) {}
        const diagnostics: Diagnostic[] = [];
        for (const method of this.parsedDocument.methods) {
            // const validStatementKinds = [SyntaxKind.FOR_STATEMENT, SyntaxKind.IF_STATEMENT, SyntaxKind.WHILE_STATEMENT];
            let previousStatment: Statement = undefined;
            for (const currentStatment of method.statements) {
                if (currentStatment.kind === SyntaxKind.DO_STATEMENT && currentStatment.expressions.length === 0) {
                    const currentStatementLine = currentStatment.action.position.line;
                    if (!previousStatment) continue;
                    const previousStatmentLine = previousStatment.action.position.line;
                    if (currentStatementLine === previousStatmentLine) {
                        const diagnostic = new Diagnostic(currentStatment.action.getRange(), `"do" statement on same line as "${previousStatment.action.value}"`, this.ruleName, DiagnosticSeverity.Warning);
                        diagnostic.source = 'lint';
                        diagnostics.push(diagnostic);
                    }
                }
                previousStatment = currentStatment;
            }
        }


        return diagnostics;
    }
}