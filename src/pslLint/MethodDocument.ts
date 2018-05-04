import { getLineContent, Diagnostic, Range, DiagnosticSeverity, Rule, IDocument } from './api';

/**
 * Checks if multiple parameters are written on the same line as the method declaration.
 */
export class MethodDocumentation implements Rule {

    report(parsedDocument: IDocument): Diagnostic[] {

        
        let diagnostics: Diagnostic[] = []
            
        parsedDocument.methods.forEach(method => {
            if (method.batch) return;
            let nextLineContent = getLineContent(parsedDocument, method.nextLine);
            let prevLineContent = getLineContent( parsedDocument, method.prevLine);
            
            if (!(prevLineContent.trim().startsWith("//"))) {
                let message = `Add Method Seperator`;
                let range = new Range(method.prevLine, 1, method.prevLine, 1);
                let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
                diagnostic.source = 'lint';
                diagnostics.push(diagnostic);
            }

            if (!(nextLineContent.trim().startsWith("/*"))) {
                let message = `Add Method Documentation`;
                let range = new Range(method.nextLine, 1, method.nextLine, 1);
                let diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Warning);
                diagnostic.source = 'lint';
                diagnostics.push(diagnostic);
            }
        });
        return diagnostics;
    }
}