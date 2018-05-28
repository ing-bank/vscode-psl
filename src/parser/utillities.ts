import * as path from 'path';
import { Member, Method, ParsedDocument, Property, parseText, MemberClass } from '../parser/parser';
import { Position, Token, Type } from '../parser/tokenizer';
import * as fs from 'fs-extra';

export interface Query {
	identifier: string
	line: number
	character: number
}

export interface FinderResult {
	fsPath: string;
	member?: Member;
}

export interface FinderPaths {
	routine: string;
	projectPsl: string[];
	corePsl: string;
	table: string
}
export const dummyPosition = new Position(0, 0);

export class ParsedDocFinder {

	parsedDocument: ParsedDocument;
	paths: FinderPaths;
	procName: string;

	private hierarchy: string[] = [];

	constructor(parsedDocument: ParsedDocument, paths: FinderPaths, getWorkspaceDocumentText?: (fsPath: string) => Promise<string>) {
		this.parsedDocument = parsedDocument;
		this.paths = paths;
		if (getWorkspaceDocumentText) this.getWorkspaceDocumentText = getWorkspaceDocumentText;
		this.procName = path.basename(this.paths.routine).split('.')[0];
	}

	async resolveResult(callTokens: Token[]): Promise<FinderResult> {
		let finder: ParsedDocFinder = this;

		if (callTokens.length === 1) {
			let result = await finder.searchParser(callTokens[0]);

			// check for core class or tables
			if (!result) {
				let pslClsNames = await getPslClsNames(this.paths.corePsl);
				if (pslClsNames.indexOf(callTokens[0].value) >= 0) {
					finder = await finder.newFinder(callTokens[0].value);
					return {
						fsPath: finder.paths.routine,
						// member: { types: [], id: new Token(Type.Alphanumeric, callTokens[0].value, dummyPosition), memberClass: MemberClass.table }
					};
				}
				let tableName = callTokens[0].value.replace('Record', '');
				let tableLocation = path.join(this.paths.table, tableName.toLowerCase(), tableName.toUpperCase() + '.TBL');
				let tableLocationExists = await fs.pathExists(tableLocation);
				if (tableLocationExists) return {
					fsPath: tableLocation,
					// member: { types: [], id: new Token(Type.Alphanumeric, tableName, dummyPosition), memberClass: MemberClass.table }
				};
				else if (callTokens[0] === this.parsedDocument.extending) {
					finder = await finder.newFinder(callTokens[0].value);
					return {
						fsPath: finder.paths.routine,
						// member: { types: [], id: new Token(Type.Alphanumeric, callTokens[0].value, dummyPosition), memberClass: MemberClass.table }
					};
				}
				// else if (callTokens[0].value === 'this' || callTokens[0].value === this.procName) {
				// 	return {
				// 		member: { id: callTokens[0], types: [new Token(Type.Alphanumeric, this.procName, dummyPosition)], memberClass: MemberClass.proc },
				// 		fsPath: this.paths.routine
				// 	};
				// }
			}

			// handle static types
			else if (result.member.types[0] === callTokens[0]) {
				finder = await finder.newFinder(result.member.id.value);
				return {
					fsPath: finder.paths.routine,
					// member: { types: [], id: new Token(Type.Alphanumeric, callTokens[0].value, dummyPosition), memberClass: MemberClass.table }
				};
			}

			return result;
		}
		else {
			let result: FinderResult;
			for (let index = 0; index < callTokens.length; index++) {
				const token = callTokens[index];

				if (index === 0) {
					// handle core class					
					let pslClsNames = await getPslClsNames(this.paths.corePsl);
					if (pslClsNames.indexOf(token.value) >= 0) {
						finder = await finder.newFinder(token.value);
						continue;
					}
					// skip over 'this'
					else if (token.value === 'this' || token.value === this.procName) {
						// result = {
						// 	member: { id: token, types: [new Token(Type.Alphanumeric, this.procName, dummyPosition)], memberClass: MemberClass.proc },
						// 	fsPath: this.paths.routine
						// };
						continue;
					}
					else {
						result = await finder.searchParser(token);
					}
				}

				if (!result) result = await finder.searchInDocument(token.value);
				if (!result) return;
				if (!callTokens[index + 1]) return result;
				let type = result.member.types[0].value;
				if (type === 'void') type = 'Primitive'; // TODO whack hack
				finder = await finder.newFinder(type);
				result = undefined;
			}
		}
	}

	async newFinder(routineName: string): Promise<ParsedDocFinder | undefined> {

		if (routineName.startsWith('Record') && routineName !== 'Record') {
			let tableName = routineName.replace('Record', '');
			let tableDirectory = path.join(this.paths.table, tableName.toLowerCase());
			let tableLocationExists = await fs.pathExists(tableDirectory);
			if (!tableLocationExists) return;
			let columns: Property[] = (await fs.readdir(tableDirectory)).filter(file => file.endsWith('.COL')).map(col => {
				let colName = col.replace(`${tableName}-`, '').replace('.COL', '');
				let ret: Property = {
					id: new Token(Type.Alphanumeric, colName, dummyPosition),
					memberClass: MemberClass.column,
					types: [new Token(Type.Alphanumeric, 'String', dummyPosition)],
					modifiers: []
				}
				return ret;
			})
			let parsedDocument: ParsedDocument = { extending: new Token(Type.Alphanumeric, 'Record', dummyPosition), properties: columns, tokens: [], methods: [], declarations: [] };
			const newPaths: FinderPaths = Object.create(this.paths);
			newPaths.routine = tableDirectory;
			return new ParsedDocFinder(parsedDocument, newPaths, this.getWorkspaceDocumentText);
		}
		const pathsWithoutExtensions: string[] = this.paths.projectPsl.map(pslPath => path.join(pslPath, routineName));

		for (const pathWithoutExtension of pathsWithoutExtensions) {
			for (const extension of ['.PROC', '.psl', '.PSL']) {
				const possiblePath = pathWithoutExtension + extension
				const routineText = await this.getWorkspaceDocumentText(possiblePath);
				if (!routineText) continue;
				const newPaths: FinderPaths = Object.create(this.paths);
				newPaths.routine = possiblePath;
				return new ParsedDocFinder(parseText(routineText), newPaths, this.getWorkspaceDocumentText);
			}
		}
	}

	/**
	* Search the parsed document and parents for a particular member
	*/
	async searchParser(queriedToken: Token): Promise<FinderResult | undefined> {
		let activeMethod = this.findActiveMethod(queriedToken);
		if (activeMethod) {
			const variable = this.searchInMethod(activeMethod, queriedToken);
			if (variable) return { member: variable, fsPath: this.paths.routine };
		}
		return this.searchInDocument(queriedToken.value);
	}

	async searchInDocument(queriedId: string): Promise<FinderResult | undefined> {
		if (path.relative(this.paths.routine, this.paths.table) === '..') {
			const foundProperty = this.parsedDocument.properties.find(p => p.id.value.toLowerCase() === queriedId.toLowerCase());
			if (foundProperty) {
				let tableName = path.basename(this.paths.routine).toUpperCase();
				return { member: foundProperty, fsPath: path.join(this.paths.routine, `${tableName}-${foundProperty.id.value}.COL`) };
			}
		}
		const foundProperty = this.parsedDocument.properties.find(p => p.id.value === queriedId);
		if (foundProperty) return { member: foundProperty, fsPath: this.paths.routine };

		const foundMethod = this.parsedDocument.methods.find(p => p.id.value === queriedId);
		if (foundMethod) return { member: foundMethod, fsPath: this.paths.routine };

		if (this.parsedDocument.extending) {
			const parentRoutineName = this.parsedDocument.extending.value;
			if (this.hierarchy.indexOf(parentRoutineName) > -1) return;
			let parentFinder: ParsedDocFinder | undefined = await this.searchForParent(parentRoutineName);
			if (!parentFinder) return;
			return parentFinder.searchInDocument(queriedId);
		}
	}

	// async findAll(): Promise<Map<string, FinderResult> | undefined> {
	// 	const search = async (members: Map<string, FinderResult>) => {
	// 		this.parsedDocument.properties.forEach(p => {
	// 			if (!members.has(p.id.value)) {
	// 				members.set(p.id.value, { member: p, fsPath: this.paths.routine });
	// 			}
	// 		});
	// 		this.parsedDocument.methods.forEach(m => {
	// 			if (!members.has(m.id.value)) {
	// 				members.set(m.id.value, { member: m, fsPath: this.paths.routine });
	// 			}
	// 		});

	// 		if (this.parsedDocument.extending) {
	// 			const parentRoutineName = this.parsedDocument.extending.value;
	// 			if (this.heirachy.indexOf(parentRoutineName) > -1) return;
	// 			let parentFinder: ParsedDocFinder | undefined = await this.searchForParent(parentRoutineName);
	// 			if (!parentFinder) return;
	// 			search(members);
	// 		}
	// 		return members;
	// 	}

	// 	let ret = new Map<string, FinderResult>();
	// 	return search(ret);
	// }

	private async searchForParent(parentRoutineName: string): Promise<ParsedDocFinder | undefined> {
		const parentFinder = await this.newFinder(parentRoutineName);
		if (!parentFinder) return;
		parentFinder.hierarchy = this.hierarchy.concat(this.paths.routine);
		return parentFinder;
	}

	private searchInMethod(activeMethod: Method, queriedToken: Token): Member | undefined {
		for (const variable of activeMethod.declarations.reverse()) {
			if (queriedToken.position.line < variable.id.position.line) continue;
			if (queriedToken.value === variable.id.value) return variable;
		}
		for (const parameter of activeMethod.parameters) {
			if (queriedToken.value === parameter.id.value) return parameter;
		}
	}

	private findActiveMethod(queriedToken: Token): Method | undefined {
		const methods = this.parsedDocument.methods.filter(method => queriedToken.position.line >= method.id.position.line);
		if (methods) return methods[methods.length - 1];
	}

	private async getWorkspaceDocumentText(fsPath: string): Promise<string> {
		return fs.readFile(fsPath).then(b => b.toString()).catch(() => '');
	}


}

async function getPslClsNames(dir: string) {
	try {
		let names = await fs.readdir(dir);
		return names.map(name => name.split('.')[0]);
	}
	catch {
		return [];
	}
}

/**
 * Get the tokens on the line of position, as well as the specific index of the token at position
 */
export function searchTokens(tokens: Token[], position: Position) {
	const tokensOnLine = tokens.filter(t => t.position.line === position.line);
	if (tokensOnLine.length === 0) return undefined;
	const index = tokensOnLine.findIndex(t => {
		if (t.isNewLine() || t.isSpace() || t.isTab()) return;
		const start: Position = t.position;
		const end: Position = { line: t.position.line, character: t.position.character + t.value.length };
		return isBetween(start, position, end);
	});
	return { tokensOnLine, index };
}

export function completion(tokensOnLine: Token[], index: number): { reference: Token | undefined, attribute?: Token } {
	const currentToken = tokensOnLine[index];
	let reference: Token;
	let attribute: Token;
	if (index >= 1) {
		if (currentToken.isPeriod() && tokensOnLine[index - 1].isAlphanumeric()) {
			reference = tokensOnLine[index - 1];
			return { reference }
		}
		else if (currentToken.isAlphanumeric() && tokensOnLine[index - 1].isPeriod() && tokensOnLine[index - 2].isAlphanumeric()) {
			reference = tokensOnLine[index - 2];
			attribute = currentToken;
			return { reference, attribute };
		}
	}

	return { reference: undefined };
}

export function getLineContent(parsedDoc: ParsedDocument, lineNumber: number): string {
	const tokensOnLine: Token[] = parsedDoc.tokens.filter(t => t.position.line === lineNumber);
	const values: string[] = tokensOnLine.map(t => t.value);
	const lineString: string = values.join('');
	return lineString;
}

function isBetween(lb: Position, t: Position, ub: Position): boolean {
	return lb.line <= t.line &&
		lb.character <= t.character &&
		ub.line >= t.line &&
		ub.character >= t.character;
}

interface Node {
	token: Token | undefined;
	parent?: Node;
	child?: Node;
}

export function getCallTokens(tokensOnLine: Token[], index: number): Token[] {
	const ret: Token[] = [];
	let current = getChildNode(tokensOnLine, index);
	if (!current) return ret;
	while (current.parent && current.token) {
		ret.unshift(current.token);
		current = current.parent;
	}
	if (current.token) ret.unshift(current.token);
	return ret;
}


export function getChildNode(tokensOnLine: Token[], index: number): Node | undefined {
	const currentToken = tokensOnLine[index];
	if (!currentToken) return { token: undefined };
	const previousToken = tokensOnLine[index - 1];
	if (previousToken) {
		let newIndex = -1;
		if (currentToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index));
		}
		else if (currentToken.isAlphanumeric() && previousToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index - 1));
		}

		if (newIndex >= 0) {
			let parent = getChildNode(tokensOnLine, newIndex);
			return { parent, token: currentToken };
		}

	}
	if (currentToken.isAlphanumeric()) {
		return { token: currentToken }
	}
	return undefined;
}

export function resolve(tokens: Token[]): number {
	const length = tokens.length;

	let parenCount = 0;

	if (length === 0) return -1;

	if (tokens[length - 1].isAlphanumeric()) return length - 1;

	for (let index = tokens.length - 1; index >= 0; index--) {
		const token = tokens[index];
		if (token.isCloseParen()) parenCount++;
		else if (token.isOpenParen()) parenCount--;
		if (parenCount === 0) {
			if (index > 0 && tokens[index - 1].isAlphanumeric()) return index - 1;
			else return -1;
		}
	}
	return -1;
}
