import * as fs from 'fs-extra';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { FinderPaths } from './config';
import { Member, MemberClass, Method, ParsedDocument, parseText, Property } from './parser';
import { Position, Token, Type } from './tokenizer';

export interface FinderResult {
	fsPath: string;
	member?: Member;
}

export const dummyPosition = new Position(0, 0);

export class ParsedDocFinder {

	parsedDocument: ParsedDocument;
	paths: FinderPaths;
	procName: string;

	private hierarchy: string[] = [];

	constructor(
		parsedDocument: ParsedDocument,
		paths: FinderPaths,
		getWorkspaceDocumentText?: (fsPath: string) => Promise<string>,
	) {
		this.parsedDocument = parsedDocument;
		this.paths = paths;
		if (getWorkspaceDocumentText) this.getWorkspaceDocumentText = getWorkspaceDocumentText;
		this.procName = path.basename(this.paths.activeRoutine).split('.')[0];
	}

	async resolveResult(callTokens: Token[]): Promise<FinderResult> {
		let finder: ParsedDocFinder = this;

		if (callTokens.length === 1) {
			const result = await finder.searchParser(callTokens[0]);

			// check for core class or tables
			if (!result) {
				const pslClsNames = await getPslClsNames(this.paths.corePsl);
				if (pslClsNames.indexOf(callTokens[0].value) >= 0) {
					finder = await finder.newFinder(callTokens[0].value);
					return {
						fsPath: finder.paths.activeRoutine,
					};
				}
				const tableName = callTokens[0].value.replace('Record', '');
				const fileDefinitionDirectory = await this.resolveFileDefinitionDirectory(tableName);
				if (fileDefinitionDirectory) {
					return {
						fsPath: path.join(fileDefinitionDirectory, tableName.toUpperCase() + '.TBL'),
					};
				}
				else if (callTokens[0] === this.parsedDocument.extending) {
					finder = await finder.newFinder(callTokens[0].value);
					return {
						fsPath: finder.paths.activeRoutine,
					};
				}
				else if (callTokens[0].value === 'this' || callTokens[0].value === this.procName) {
					return {
						fsPath: this.paths.activeRoutine,
					};
				}
			}

			// handle static types
			else if (result.member.types[0] === callTokens[0]) {
				finder = await finder.newFinder(result.member.id.value);
				return {
					fsPath: finder.paths.activeRoutine,
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
					const pslClsNames = await getPslClsNames(this.paths.corePsl);
					if (pslClsNames.indexOf(token.value) >= 0) {
						finder = await finder.newFinder(token.value);
						continue;
					}
					// skip over 'this'
					else if (token.value === 'this' || token.value === this.procName) {
						result = {
							fsPath: this.paths.activeRoutine,
						};
						continue;
					}
					else {
						result = await finder.searchParser(token);
					}
				}

				if (!result || (result.fsPath === this.paths.activeRoutine && !result.member)) {
					result = await finder.searchInDocument(token.value);
				}
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
			const tableName = routineName.replace('Record', '');
			const tableDirectory = await this.resolveFileDefinitionDirectory(tableName.toLowerCase());
			if (!tableDirectory) return;
			const columns: Property[] = (await fs.readdir(tableDirectory)).filter(file => file.endsWith('.COL')).map(col => {
				const colName = col.replace(`${tableName}-`, '').replace('.COL', '').toLowerCase();
				const ret: Property = {
					id: new Token(Type.Alphanumeric, colName, dummyPosition),
					memberClass: MemberClass.column,
					modifiers: [],
					types: [new Token(Type.Alphanumeric, 'String', dummyPosition)],
				};
				return ret;
			});
			const text = await this.getWorkspaceDocumentText(path.join(tableDirectory, `${tableName.toUpperCase()}.TBL`));
			const parsed = jsonc.parse(text);
			const parentFileId = parsed.PARFID;
			const extendingValue = parentFileId ? `Record${parentFileId}` : 'Record';
			const parsedDocument: ParsedDocument = {
				comments: [],
				declarations: [],
				extending: new Token(Type.Alphanumeric, extendingValue, dummyPosition),
				methods: [],
				properties: columns,
				pslPackage: '',
				tokens: [],
			};
			const newPaths: FinderPaths = Object.create(this.paths);
			newPaths.activeRoutine = '';
			newPaths.activeTable = tableDirectory;
			return new ParsedDocFinder(parsedDocument, newPaths, this.getWorkspaceDocumentText);
		}
		const pathsWithoutExtensions: string[] = this.paths.projectPsl.map(pslPath => path.join(pslPath, routineName));

		for (const pathWithoutExtension of pathsWithoutExtensions) {
			for (const extension of ['.PROC', '.psl', '.PSL']) {
				const possiblePath = pathWithoutExtension + extension;
				const routineText = await this.getWorkspaceDocumentText(possiblePath);
				if (!routineText) continue;
				const newPaths: FinderPaths = Object.create(this.paths);
				newPaths.activeRoutine = possiblePath;
				return new ParsedDocFinder(parseText(routineText), newPaths, this.getWorkspaceDocumentText);
			}
		}
	}

	/**
	 * Search the parsed document and parents for a particular member
	 */
	async searchParser(queriedToken: Token): Promise<FinderResult | undefined> {
		const activeMethod = this.findActiveMethod(queriedToken);
		if (activeMethod) {
			const variable = this.searchInMethod(activeMethod, queriedToken);
			if (variable) return { member: variable, fsPath: this.paths.activeRoutine };
		}
		return this.searchInDocument(queriedToken.value);
	}

	async searchInDocument(queriedId: string): Promise<FinderResult | undefined> {
		let foundProperty;
		if (this.paths.activeTable) {
			foundProperty = this.parsedDocument.properties.find(p => p.id.value.toLowerCase() === queriedId.toLowerCase());
			if (foundProperty) {
				const tableName = path.basename(this.paths.activeTable).toUpperCase();
				return {
					fsPath: path.join(this.paths.activeTable, `${tableName}-${foundProperty.id.value.toUpperCase()}.COL`),
					member: foundProperty,
				};
			}
		}

		foundProperty = this.parsedDocument.properties.find(p => p.id.value === queriedId);
		if (foundProperty) return { member: foundProperty, fsPath: this.paths.activeRoutine };

		const foundMethod = this.parsedDocument.methods.find(p => p.id.value === queriedId);
		if (foundMethod) return { member: foundMethod, fsPath: this.paths.activeRoutine };

		if (this.parsedDocument.extending) {
			const parentRoutineName = this.parsedDocument.extending.value;
			if (this.hierarchy.indexOf(parentRoutineName) > -1) return;
			const parentFinder: ParsedDocFinder | undefined = await this.searchForParent(parentRoutineName);
			if (!parentFinder) return;
			return parentFinder.searchInDocument(queriedId);
		}

	}

	async findAllInDocument(results?: FinderResult[]): Promise<FinderResult[] | undefined> {
		if (!results) results = [];

		const addToResults = (result: FinderResult) => {
			if (!results.find(r => r.member.id.value === result.member.id.value)) {
				results.push(result);
			}
		};

		if (this.paths.activeTable) {
			this.parsedDocument.properties.forEach(property => {
				const tableName = path.basename(this.paths.activeTable).toUpperCase();
				addToResults(
					{ member: property, fsPath: path.join(this.paths.activeTable, `${tableName}-${property.id.value.toUpperCase()}.COL`) },
				);
			});
		}
		this.parsedDocument.properties.forEach(property => {
			addToResults({ member: property, fsPath: this.paths.activeRoutine });
		});

		this.parsedDocument.methods.forEach(method => {
			addToResults({ member: method, fsPath: this.paths.activeRoutine });
		});

		if (this.parsedDocument.extending) {
			const parentRoutineName = this.parsedDocument.extending.value;
			if (this.hierarchy.indexOf(parentRoutineName) > -1) return results;
			const parentFinder: ParsedDocFinder | undefined = await this.searchForParent(parentRoutineName);
			if (!parentFinder) return results;
			return parentFinder.findAllInDocument(results);
		}
		return results;
	}

	async resolveFileDefinitionDirectory(tableName: string): Promise<string> {
		for (const tableSource of this.paths.tables) {
			const directory = path.join(tableSource, tableName.toLowerCase());
			if (await fs.pathExists(directory)) {
				return directory;
			}
		}
		return '';
	}

	private async searchForParent(parentRoutineName: string): Promise<ParsedDocFinder | undefined> {
		const parentFinder = await this.newFinder(parentRoutineName);
		if (!parentFinder) return;
		parentFinder.hierarchy = this.hierarchy.concat(this.paths.activeRoutine);
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
		const names = await fs.readdir(dir);
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
	routine?: boolean;
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

function getChildNode(tokensOnLine: Token[], index: number): Node | undefined {
	const currentToken = tokensOnLine[index];
	if (!currentToken) return { token: undefined };
	const previousToken = tokensOnLine[index - 1];
	const nextToken = tokensOnLine[index + 1];
	let routine = false;
	if (previousToken) {
		let newIndex = -1;
		if (currentToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index));
		}
		else if (previousToken.isCaret()) {
			routine = true;
		}
		else if (currentToken.isAlphanumeric() && previousToken.isPeriod()) {
			newIndex = resolve(tokensOnLine.slice(0, index - 1));
		}

		if (newIndex >= 0) {
			const parent = getChildNode(tokensOnLine, newIndex);
			return { parent, token: currentToken };
		}

	}
	if (nextToken && nextToken.isCaret()) {
		const routineToken = tokensOnLine[index + 2];
		if (!routineToken) return undefined;
		return { parent: { token: routineToken, routine: true }, token: currentToken };
	}
	if (currentToken.isAlphanumeric()) {
		return { token: currentToken, routine };
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

interface Callable {
	tokenBufferIndex: number;
	parameterIndex: number;
}

export function findCallable(tokensOnLine: Token[], index: number) {
	const callables: Callable[] = [];
	for (let tokenBufferIndex = 0; tokenBufferIndex <= index; tokenBufferIndex++) {
		const token = tokensOnLine[tokenBufferIndex];
		if (!tokenBufferIndex && !token.isTab() && !token.isSpace()) return;
		if (token.isOpenParen()) {
			callables.push({ tokenBufferIndex: tokenBufferIndex - 1, parameterIndex: 0 });
		}
		else if (token.isCloseParen()) {
			if (callables.length) callables.pop();
			else return;
		}
		else if (token.isComma() && callables.length) {
			callables[callables.length - 1].parameterIndex += 1;
		}
	}
	if (!callables.length) return;
	const activeCallable = callables[callables.length - 1];
	return {
		callTokens: getCallTokens(tokensOnLine, activeCallable.tokenBufferIndex),
		parameterIndex: activeCallable.parameterIndex,
	};
}

export function getLineAfter(method: Method): number {
	return method.closeParen ? method.closeParen.position.line + 1 : method.id.position.line + 1;
}

export function getCommentsOnLine(parsedDocument: ParsedDocument, lineNumber: number): Token[] {
	return parsedDocument.comments.filter(t => {
		return t.position.line === lineNumber;
	});
}
