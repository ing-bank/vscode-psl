import { EventEmitter, TextDocumentContentProvider, Uri, workspace } from 'vscode';
import { ParsedDocument, parseText } from '../parser';

export class MumpsVirtualDocument {

	static readonly schemes = {
		compiled: 'compiledMumps',
		coverage: 'coverageMumps',
	};

	readonly parsedDocument: ParsedDocument;

	constructor(
		readonly routineName: string,
		readonly sourceCode: string,
		/**
		 * Uri with scheme in `mumpsSchemes`
		 */
		readonly uri: Uri,
	) {
		this.parsedDocument = parseText(sourceCode);
		virtualDocuments.set(uri.toString(), this);
	}
}

export class MumpsDocumentProvider implements TextDocumentContentProvider {
	provideTextDocumentContent(uri: Uri): string {
		return getVirtualDocument(uri).sourceCode;
	}
}

export function getVirtualDocument(uri: Uri) {
	return virtualDocuments.get(uri.toString());
}

function isScheme(uri: Uri) {
	return Object.values(MumpsVirtualDocument.schemes).indexOf(uri.scheme) > -1;
}

/**
 * Virtual Documents keyed by the string the string representation of their `Uri`s
 */
const virtualDocuments = new Map<string, MumpsVirtualDocument>();

const _onDidDeleteVirtualMumps = new EventEmitter<Uri>();
export const onDidDeleteVirtualMumps = _onDidDeleteVirtualMumps.event;

workspace.onDidCloseTextDocument(textDocument => {
	const uri = textDocument.uri;
	if (isScheme(uri)) {
		virtualDocuments.delete(uri.toString());
		_onDidDeleteVirtualMumps.fire(uri);
	}
});
