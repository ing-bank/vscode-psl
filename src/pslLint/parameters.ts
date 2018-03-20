import { Diagnostic, Range, DiagnosticSeverity, Rule, IDocument } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class ParametersOnNewLine implements Rule {

    report(parsedDocument: IDocument): Diagnostic[] {

        let diagnostics: Diagnostic[] = []
        parsedDocument.methods.forEach(method => {
            if (method.batch) return;
            let methodLine = method.id.position.line;
            method.parameters.forEach(param => {
                let paramPosition = param.id.position;
                if (paramPosition.line === methodLine && method.parameters.length > 1) {
                    let range = new Range(paramPosition.line, paramPosition.character, paramPosition.line, paramPosition.character + param.id.value.length);
                    let message = `param "${param.id.value}" on same line as label "${method.id.value}"`
                    let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
                    diagnostic.source = 'lint';
                    diagnostics.push(diagnostic);
                }
            });
        });
        return diagnostics;
    }
}