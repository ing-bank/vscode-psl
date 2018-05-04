import { Diagnostic, DiagnosticSeverity, Rule, Document } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class ParametersOnNewLine implements Rule {

    report(parsedDocument: Document): Diagnostic[] {

        let diagnostics: Diagnostic[] = []
        parsedDocument.parsedDocument.methods.forEach(method => {
            if (method.batch) return;
            let methodLine = method.id.position.line;
            method.parameters.forEach(param => {
                let paramPosition = param.id.position;
                if (paramPosition.line === methodLine && method.parameters.length > 1) {
                    let message = `param "${param.id.value}" on same line as label "${method.id.value}"`
                    let diagnostic = new Diagnostic(param.id.getRange(), message, DiagnosticSeverity.Warning);
                    diagnostic.source = 'lint';
                    diagnostics.push(diagnostic);
                }
            });
        });
        return diagnostics;
    }
}