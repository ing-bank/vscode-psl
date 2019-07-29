import * as vscode from 'vscode';
import { EnvironmentConfig } from '../common/environment';
import { getVirtualDocument, MumpsVirtualDocument, onDidDeleteVirtualMumps } from '../language/mumps';
import { getConnection } from './hostCommandUtils';

export interface RoutineCoverage {
	methods: MethodCoverage[];
	coverage: string;
	name: string;
}

interface MethodCoverage {
	name: string;
	coverageSequence: LineCoverage[];
}

interface LineCoverage {
	indicator: CoverageIndicator;
}

enum CoverageIndicator {
	NOT_COVERED = 0,
	COVERED = 1,
	COMMENT = 2,
}

interface ParsedOutput {
	/**
	 * Output without coverage information.
	 */
	output: string;

	/**
	 * Parsed coverage information for a series of routines.
	 */
	documents: RoutineCoverage[];
}

const diagnosticCollection = vscode.languages.createDiagnosticCollection('psl-test');

const coverageScheme = MumpsVirtualDocument.schemes.coverage;

function createDecoration(backgroundKey: string, rulerKey: string) {
	return vscode.window.createTextEditorDecorationType({
		backgroundColor: new vscode.ThemeColor(backgroundKey),
		isWholeLine: true,
		overviewRulerColor: new vscode.ThemeColor(rulerKey),
		overviewRulerLane: vscode.OverviewRulerLane.Full,
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
	});
}
const notCovered = createDecoration('diffEditor.removedTextBackground', 'editorOverviewRuler.errorForeground');
const covered = createDecoration('diffEditor.insertedTextBackground', 'diffEditor.insertedTextBackground');

onDidDeleteVirtualMumps(uri => {
	if (uri.scheme === coverageScheme) {
		diagnosticCollection.delete(uri);
	}
});

vscode.window.onDidChangeActiveTextEditor(textEditor => {
	if (textEditor && textEditor.document.uri.scheme === coverageScheme) {
		setCoverageDecorations(textEditor);
	}
});

export async function displayCoverage(documents: RoutineCoverage[], env: EnvironmentConfig, testName: string) {
	const baseUri = vscode.Uri.parse(`${coverageScheme}:`);
	const connection = await getConnection(env);
	for (const documentCoverage of documents) {
		await connection.get(`${documentCoverage.name}.m`).then(mCode => {
			const sourceCode = mCode;
			const uri = baseUri.with({
				path: `/${env.name}/${testName}/${documentCoverage.name}.m`,
				query: JSON.stringify(documentCoverage),
			});
			const virtualMumps = new MumpsVirtualDocument(documentCoverage.name, sourceCode, uri);
			setCoverageDiagnostics(virtualMumps);
			vscode.window.showTextDocument(virtualMumps.uri, { preview: false });
		});
	}
}

function getRoutineCoverage(uri: vscode.Uri): RoutineCoverage {
	return JSON.parse(uri.query);
}

function setCoverageDiagnostics(virtualMumps: MumpsVirtualDocument) {
	let allDiagnostics: vscode.Diagnostic[] = [];
	getRoutineCoverage(virtualMumps.uri).methods.forEach(coverageMethod => {
		const documentMethod = virtualMumps.parsedDocument.methods.find(method => {
			return method.id.value === coverageMethod.name;
		});
		if (!documentMethod) return;
		const methodRanges = collectMethodRanges(coverageMethod);
		const diagnostics = methodRanges.map(methodRange => {
			const vscodeRange = new vscode.Range(
				documentMethod.line + methodRange.start,
				0,
				documentMethod.line + methodRange.end,
				Number.MAX_VALUE,
			);
			return new vscode.Diagnostic(
				vscodeRange,
				`Missing coverage in method "${coverageMethod.name}"`,
				vscode.DiagnosticSeverity.Error,
			);
		});
		allDiagnostics = [...allDiagnostics, ...diagnostics];
	});
	diagnosticCollection.set(virtualMumps.uri, allDiagnostics);
}

function collectMethodRanges(methodCoverage: MethodCoverage) {
	const ranges = [];
	let previousIndicator: number;
	interface SequenceRange { start: number; end: number; }
	const last = methodCoverage.coverageSequence.reduce((range: SequenceRange, lineCoverage, index) => {
		let indicator: number;
		if (indicator === CoverageIndicator.COMMENT) indicator = previousIndicator;
		else indicator = lineCoverage.indicator;

		if (indicator === CoverageIndicator.NOT_COVERED) {
			if (!range) {
				previousIndicator = indicator;
				return { start: index, end: index };
			}
			else {
				previousIndicator = indicator;
				range.end = index;
				return range;
			}
		}
		if (indicator === CoverageIndicator.COVERED && range) {
			previousIndicator = indicator;
			ranges.push(range);
		}
	}, undefined);
	if (last) ranges.push(last);
	return ranges;
}

/**
 * Called every time the document becomes active (`onDidChangeActiveTextEditor`)
 * for the mumps coverage  uri scheme.
 */
function setCoverageDecorations(textEditor: vscode.TextEditor) {
	const notCoveredLines: number[] = [];
	const coveredLines: number[] = [];
	const virtualMumps = getVirtualDocument(textEditor.document.uri);
	getRoutineCoverage(virtualMumps.uri).methods.forEach(coverageMethod => {
		const documentMethod = virtualMumps.parsedDocument.methods.find(method => {
			return method.id.value === coverageMethod.name;
		});
		if (!documentMethod) return;
		let lastIndicator: number;
		for (let lineNumber = 0; lineNumber < coverageMethod.coverageSequence.length; lineNumber++) {
			const indicator = coverageMethod.coverageSequence[lineNumber].indicator;
			if (!indicator || (indicator === CoverageIndicator.COMMENT && !lastIndicator)) {
				notCoveredLines.push(documentMethod.line + lineNumber);
				lastIndicator = 0;
			}
			else {
				coveredLines.push(documentMethod.line + lineNumber);
				lastIndicator = 1;
			}
		}
	});
	textEditor.setDecorations(notCovered, notCoveredLines.map(line => new vscode.Range(line, 0, line, Number.MAX_VALUE)));
	textEditor.setDecorations(covered, coveredLines.map(line => new vscode.Range(line, 0, line, Number.MAX_VALUE)));
}

/**
 * Parses the RPC output of a coverage run. Returns sanitized output and parsed coverage report.
 */
export function parseCoverageOutput(input: string): ParsedOutput {
	const parsed: ParsedOutput = {
		documents: [],
		output: input,
	};

	const begin = '#BeginCoverageInfo';
	const end = '#EndCoverageInfo';

	if (!input.includes(begin) && !input.includes(end)) {
		return parsed;
	}

	const split1 = input.split(begin);
	const split2 = split1[1].split(end);
	const output = split1[0] + split2[split2.length - 1];
	parsed.output = output;

	const routinesToPercentages = new Map<string, string>();

	const match = output.match(/\d+\.\d+% - \w+/g);
	if (!match) return parsed;

	match.forEach(l => routinesToPercentages.set((l.split(' - ')[1]), l.split(' - ')[0]));

	parsed.documents = extractDocumentCoverage(split2[0], routinesToPercentages);

	return parsed;
}

function extractDocumentCoverage(codeOutput: string, routinesToPercentages: Map<string, string>): RoutineCoverage[] {
	const splitOutput = codeOutput.split(/\r?\n/).filter(x => x).map(x => x.trim());

	const documents: RoutineCoverage[] = [];
	let documentCoverage: RoutineCoverage = { coverage: '', methods: [], name: '' };
	const initialize = (routineName: string) => {
		documentCoverage = { name: routineName, methods: [], coverage: routinesToPercentages.get(routineName) || '' };
		documents.push(documentCoverage);
	};

	for (const line of splitOutput) {
		if (line.match(/^9\|.*/)) {
			initialize(line.split('|')[1]);
		}
		else if (line.match(/^1/)) {
			documentCoverage.methods.push(
				{ name: line.split('|')[1], coverageSequence: line.split('|')[2].split('').map(s => ({ indicator: Number(s) })) },
			);
		}
	}

	return documents;
}
