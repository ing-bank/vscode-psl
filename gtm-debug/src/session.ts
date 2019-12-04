/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, StoppedEvent,
	Thread, StackFrame, Scope, Source, Handles, OutputEvent, LoadedSourceEvent
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { DirectMode } from './directMode';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
const { Subject } = require('await-notify');

/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	command: string;
	args: string[];
}

export class GtmDebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hard-coded ID for the default thread
	private static THREAD_ID = 1;

	private directMode!: DirectMode;

	private variableHandles = new Handles<string>();
	private configurationDone = new Subject();

	private sources = new Map<string, { sourceCode: string, source: Source }>();
	private functionBreakpoints: DebugProtocol.FunctionBreakpoint[] = [];
	private sourceBreakpoints = new Map<string, DebugProtocol.SourceBreakpoint[]>();

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("mock-debug.txt");

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		response.body.supportsFunctionBreakpoints = true;

		response.body.supportsLoadedSourcesRequest = true;

		this.sendResponse(response);
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);

		// notify the launchRequest that configuration has finished
		this.configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {

		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(Logger.LogLevel.Error, false);

		// wait until configuration has finished (and configurationDoneRequest has been called)
		await this.configurationDone.wait(1000);

		// start the program in the runtime
		this.directMode = new DirectMode(args.command, args.args);

		this.directMode.stderr.subscribe(err => {
			this.sendEvent(new OutputEvent(err, 'console'));
			if (err.includes('%GTM-I-BREAK')) {
				this.sendEvent(new StoppedEvent('breakpoint', GtmDebugSession.THREAD_ID));
			}
			if (err.includes('%GTM-E-') && err.includes('At M source location')) {
				this.sendEvent(new StoppedEvent('exception', GtmDebugSession.THREAD_ID));
			}
		})
		this.sendEvent(new InitializedEvent());

		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		// runtime supports no threads so just return a default thread.
		response.body = {
			threads: [
				new Thread(GtmDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		if (!args.source?.name || !args.breakpoints) {
			this.sendResponse(response);
			return;
		}
		const breakpoints: DebugProtocol.SourceBreakpoint[] = args.breakpoints;
		const sourceName = args.source.name;
		const breakpointsForSource = this.sourceBreakpoints.get(sourceName);

		const routineName = args.source.name.replace('.m', '');

		if (breakpointsForSource) {
			breakpointsForSource.forEach(breakpoint => {
				const location = `+${breakpoint.line}^${routineName}`;
				this.directMode.setBreakPoint(`-${location}`).subscribe();
			});
		}

		breakpoints.forEach(breakpoint => {
			const location = `+${breakpoint.line}^${routineName}`;
			this.createSource(location).subscribe(source => {
				const verifiedBreakpoints = breakpoints.map(b => ({ ...b, verified: true, source: source.source }));

				response.body = {
					breakpoints: verifiedBreakpoints
				};
				this.sourceBreakpoints.set(sourceName, verifiedBreakpoints);
				this.sendResponse(response);
			});
			this.directMode.setBreakPoint(location).subscribe();
		});
	}

	protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments) {
		this.functionBreakpoints.forEach(breakpoint => {
			this.directMode.setBreakPoint(`-${breakpoint.name}`).subscribe();
		});

		if (!args.breakpoints) {
			this.sendResponse(response);
			return;
		}
		args.breakpoints?.forEach(breakpoint => {
			const location = breakpoint.name;
			this.createSource(location).subscribe(source => {
				const verifiedBreakpoints = args.breakpoints.map(b => ({ ...b, verified: true, source: source.source }));
				response.body = {
					breakpoints: verifiedBreakpoints
				};
				this.functionBreakpoints = verifiedBreakpoints;
				this.sendResponse(response);
			});
			this.directMode.setBreakPoint(location).subscribe();
		});
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		this.directMode.zShow().subscribe(stack => {
			const frames = stack.match(/(%?\w+)?\+?(\d+)?\^(%?\w+(\+\d+)?)/g);
			if (frames) {
				forkJoin(frames.map(location => {
					return this.createSource(location);
				})).subscribe(sources => {
					const stackFrames = sources.map((sourced, i) => {
						return new StackFrame(i, sourced.location, sourced.source, sourced.documentLineNumber);
					})
					response.body = {
						stackFrames,
						totalFrames: frames.length
					};
					this.sendResponse(response);
				})
			}
		});
	}

	protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments) {
		let location: string | undefined;

		if (args.source?.name) {
			const routineName = args.source.name.replace('.m', '');
			location = `^${routineName}`;
		}
		else if (args.source?.path) {
			const routineName = args.source.path.replace('.m', '');
			location = `^${routineName}`;
		}
		this.directMode.zPrint(location).subscribe(content => {
			response.body = { content };
			this.sendResponse(response);
		});
	}

	protected loadedSourcesRequest(response: DebugProtocol.LoadedSourcesResponse, args: DebugProtocol.LoadedSourcesArguments): void {
		const sources: Source[] = [];
		for (const source of this.sources.values()) {
			sources.push(source.source);
		}
		response.body = {
			sources
		}
		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		response.body = {
			scopes: [
				new Scope("Global", this.variableHandles.create("global"), false),
			]
		};
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
		this.directMode.zWrite().subscribe(variableOutput => {
			const variables: DebugProtocol.Variable[] = variableOutput.split('\n').map(v => {
				return {
					name: v.split('=')[0],
					value: v.split('=').slice(1).join('='),
					variablesReference: 0
				}
			})

			response.body = {
				variables
			};

			this.sendResponse(response);
		});
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse): void {
		this.directMode.zContinue().subscribe(output => {
			this.sendEvent(new OutputEvent(output, 'stdout'));
			this.sendEvent(new StoppedEvent('breakpoint', GtmDebugSession.THREAD_ID));
		})
		response.body = { allThreadsContinued: true }
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse): void {
		this.directMode.zStep('OVER').subscribe(output => {
			this.sendEvent(new OutputEvent(output, 'stdout'));
			this.sendEvent(new StoppedEvent('step', GtmDebugSession.THREAD_ID));
		})
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse): void {
		this.directMode.zStep('INTO').subscribe(output => {
			this.sendEvent(new OutputEvent(output, 'stdout'));

			this.sendEvent(new StoppedEvent('step', GtmDebugSession.THREAD_ID));
		})
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse): void {
		this.directMode.zStep('OUTOF').subscribe(output => {
			this.sendEvent(new OutputEvent(output, 'stdout'));

			this.sendEvent(new StoppedEvent('step', GtmDebugSession.THREAD_ID));
		})
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		if (args.context === 'repl') {
			this.directMode.execute(args.expression).subscribe(result => {
				response.body = {
					result,
					variablesReference: 0,
				};
				this.sendResponse(response);
			});
		}
		else if (args.context === 'watch') {
			this.directMode.execute(args.expression).subscribe(result => {
				response.body = {
					result: `"${result.trim()}"`,
					type: 'string',
					variablesReference: 0,
				};
				this.sendResponse(response);
			});
		}
	}

	private createSource(location: string): Observable<Sourced> {
		const [, label, line, routineName] = (/(%?\w+)?\+?(\d+)?\^(%?\w+(\+\d+)?)/).exec(location) as RegExpExecArray;
		if (!this.sources.has(routineName)) {
			return this.directMode.zPrint(`^${routineName}`).pipe(
				map(sourceCode => {
					const source = new Source(`${routineName}.m`, `${routineName}.m`, 1);
					this.sources.set(routineName, { sourceCode, source });
					this.sendEvent(new LoadedSourceEvent('new', source));
					const labelLineNumber: number = label ? sourceCode.split(/\r?\n/).findIndex(line => line.startsWith(label)) + 1 : 0;
					const documentLineNumber = labelLineNumber + (line ? Number.parseInt(line) : 0)
					return {
						source,
						documentLineNumber,
						location,
					}
				})
			)
		}
		else {
			const source = this.sources.get(routineName) as { sourceCode: string, source: Source };
			const labelLineNumber: number = label ? source.sourceCode.split(/\r?\n/).findIndex(line => line.startsWith(label)) + 1 : 0;
			const documentLineNumber = labelLineNumber + (line ? Number.parseInt(line) : 0);
			return of({
				source: source.source,
				documentLineNumber,
				location,
			})
		}
	}
}


interface Sourced {
	source: Source;
	documentLineNumber: number;
	location: string;
}
