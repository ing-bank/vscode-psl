import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { fromEvent, Observable, Subject } from 'rxjs';
import { map, filter, first } from 'rxjs/operators';


export class DirectMode {
	dmProcess: ChildProcessWithoutNullStreams;
	stdout: Observable<string>;
	stderr: Observable<string>;

	private outputBuffer: string = '';
	private count: number = 0;
	private responsesSubject: Subject<string> = new Subject();

	static zPrompt: string = 'vscode-debug m>';

	constructor(command: string, args: string[]) {

		this.dmProcess = spawn(command, args);

		this.stdout = fromEvent<Buffer>(this.dmProcess.stdout, 'data').pipe(map(x => x.toString()));
		this.stderr = fromEvent<Buffer>(this.dmProcess.stderr, 'data').pipe(map(x => x.toString()));

		this.setPrompt();
		this.listen();
	}

	execute(msg: string): Observable<string> {
		const header = `${this.count}_${msg}`;
		this.dmProcess.stdin.write(`WRITE "${DirectMode.escapeMumps(header)}",! ${msg}\n`);
		this.count++;
		return this.responsesSubject.pipe(
			filter(response => response.startsWith(header)),
			map(response => {
				if (header === response) { return ''; }
				else { return response.replace(header + '\n', ''); }
			}),
			first(),
		);
	}

	setPrompt(): Observable<string> {
		return this.execute(`SET $ZPROMPT="${DirectMode.zPrompt}"`);
	}

	zPrint(location?: string): Observable<string> {
		return this.execute(`ZPRINT ${location || ''}`);
	}

	zWrite(): Observable<string> {
		return this.execute(`ZWRITE`);
	}

	zShow(): Observable<string> {
		return this.execute(`ZSHOW`);
	}

	zStep(step: 'INTO' | 'OUTOF' | 'OVER'): Observable<string> {
		return this.execute(`ZSTEP ${step}:"ZPRINT @$ZPOS"`);
	}

	zContinue(): Observable<string> {
		return this.execute(`ZCONTINUE`);
	}

	listen(): void {
		this.stdout.subscribe(out => {
			this.outputBuffer += out;
			const pieces = this.outputBuffer.split(new RegExp(`^${DirectMode.zPrompt}\n?$`, 'gm'));
			for (const response of pieces.slice(0, -1)) {
				this.responsesSubject.next(response.trimLeft());
			}
			this.outputBuffer = pieces[pieces.length - 1] || '';
		});
	}

	static escapeMumps(msg: string) {
		return msg.replace(/"/g, '""');
	}
}
