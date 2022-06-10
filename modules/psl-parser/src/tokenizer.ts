export function* getTokens(documentContents: string): IterableIterator<Token> {
	const t: Tokenizer = new Tokenizer();

	for (const char of documentContents) {
		t.charType = getType(char);
		if (t.tokenType === 0) {
			t.tokenType = t.charType;
		}
		while (!t.parsed) {
			if (t.parseCharacter(char)) {
				yield t.token;
			}
		}
		t.parsed = false;
	}
	if (t.tokenType !== 0) { // if there is an unfinished token left
		t.finalizeToken(0);
		yield t.token;
	}
}

export class Token {
	type: Type;
	value: string;
	position: Position;

	constructor(type: Type, value: string, position: Position) {
		this.position = position;
		this.value = value;
		this.type = type;
	}

	getRange() {
		const startPosition: Position = this.position;
		const endPosition: Position = { line: this.position.line, character: this.position.character + this.value.length };
		return new Range(startPosition, endPosition);
	}
	isWhiteSpace() {
		return this.type === Type.Space
			|| this.type === Type.Tab
			|| this.type === Type.NewLine
			|| this.type === Type.Undefined;
	}
	isAlphanumeric() {
		return this.type === Type.Alphanumeric;
	}
	isNumeric() {
		return this.type === Type.Numeric;
	}
	isLineComment() {
		return this.type === Type.LineComment;
	}
	isBlockComment() {
		return this.type === Type.BlockComment;
	}
	isString() {
		return this.type === Type.String;
	}
	isLineCommentInit() {
		return this.type === Type.LineCommentInit;
	}
	isBlockCommentInit() {
		return this.type === Type.BlockCommentInit;
	}
	isBlockCommentTerm() {
		return this.type === Type.BlockCommentTerm;
	}
	isDoubleQuotes() {
		return this.type === Type.DoubleQuotes;
	}
	isSlash() {
		return this.type === Type.Slash;
	}
	isTab() {
		return this.type === Type.Tab;
	}
	isNewLine() {
		return this.type === Type.NewLine;
	}
	isSpace() {
		return this.type === Type.Space;
	}
	isExclamationMark() {
		return this.type === Type.ExclamationMark;
	}
	isNumberSign() {
		return this.type === Type.NumberSign;
	}
	isDollarSign() {
		return this.type === Type.DollarSign;
	}
	isAmpersand() {
		return this.type === Type.Ampersand;
	}
	isSingleQuote() {
		return this.type === Type.SingleQuote;
	}
	isOpenParen() {
		return this.type === Type.OpenParen;
	}
	isCloseParen() {
		return this.type === Type.CloseParen;
	}
	isAsterisk() {
		return this.type === Type.Asterisk;
	}
	isPlusSign() {
		return this.type === Type.PlusSign;
	}
	isComma() {
		return this.type === Type.Comma;
	}
	isMinusSign() {
		return this.type === Type.MinusSign;
	}
	isPeriod() {
		return this.type === Type.Period;
	}
	isColon() {
		return this.type === Type.Colon;
	}
	isSemiColon() {
		return this.type === Type.SemiColon;
	}
	isLessThan() {
		return this.type === Type.LessThan;
	}
	isEqualSign() {
		return this.type === Type.EqualSign;
	}
	isGreaterThan() {
		return this.type === Type.GreaterThan;
	}
	isQuestionMark() {
		return this.type === Type.QuestionMark;
	}
	isAtSymbol() {
		return this.type === Type.AtSymbol;
	}
	isOpenBracket() {
		return this.type === Type.OpenBracket;
	}
	isBackslash() {
		return this.type === Type.Backslash;
	}
	isCloseBracket() {
		return this.type === Type.CloseBracket;
	}
	isCaret() {
		return this.type === Type.Caret;
	}
	isUnderscore() {
		return this.type === Type.Underscore;
	}
	isBackQuote() {
		return this.type === Type.BackQuote;
	}
	isOpenBrace() {
		return this.type === Type.OpenBrace;
	}
	isPipe() {
		return this.type === Type.Pipe;
	}
	isCloseBrace() {
		return this.type === Type.CloseBrace;
	}
	isTilde() {
		return this.type === Type.Tilde;
	}
}

export class Range {

	/**
	 * The start position. It is before or equal to [end](#Range.end).
	 */
	readonly start: Position;

	/**
	 * The end position. It is after or equal to [start](#Range.start).
	 */
	readonly end: Position;

	/**
	 * Create a new range from two positions. If `start` is not
	 * before or equal to `end`, the values will be swapped.
	 *
	 * @param start A position.
	 * @param end A position.
	 */
	constructor(start: Position, end: Position);

	/**
	 * Create a new range from number coordinates. It is a shorter equivalent of
	 * using `new Range(new Position(startLine, startCharacter), new Position(endLine, endCharacter))`
	 *
	 * @param startLine A zero-based line value.
	 * @param startCharacter A zero-based character value.
	 * @param endLine A zero-based line value.
	 * @param endCharacter A zero-based character value.
	 */
	constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);

	constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
		if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number' && typeof d === 'number') {
			this.start = new Position(a, b);
			this.end = new Position(c, d);
		}
		else {
			this.start = a as Position;
			this.end = b as Position;
		}
	}

}

export class Position {

	/**
	 * The zero-based line value.
	 */
	readonly line: number;

	/**
	 * The zero-based character value.
	 */
	readonly character: number;

	/**
	 * @param line A zero-based line value.
	 * @param character A zero-based character value.
	 */
	constructor(line: number, character: number) {
		this.line = line;
		this.character = character;
	}
}

class Tokenizer {
	documentLine: number;
	documentColumn: number;

	charType: number;
	tokenType: number;
	tokenValue: string;
	tokenPosition: Position;
	token: Token;

	parsed: boolean;
	stringOpen: boolean;
	firstSlash: boolean;
	asterisk: boolean;

	constructor() {
		this.documentLine = 0;
		this.documentColumn = 0;

		this.charType = 0;
		this.tokenType = 0;
		this.tokenValue = '';
		this.tokenPosition = { line: this.documentLine, character: this.documentColumn };

		this.parsed = false;
		this.stringOpen = false;
		this.firstSlash = false;
		this.asterisk = false;
	}

	parseCharacter(char: string): boolean {
		if (this.tokenType === Type.Alphanumeric) {
			if (this.charType === Type.Alphanumeric || this.charType === Type.Numeric) {
				this.tokenValue = this.tokenValue + char;
				this.parsed = true;
				this.documentColumn++;
				return false;
			} else {
				this.finalizeToken(this.charType);
				return true;
			}
		} else if (this.tokenType === Type.Numeric) {
			if (this.charType === Type.Numeric) {
				this.tokenValue = this.tokenValue + char;
				this.parsed = true;
				this.documentColumn++;
				return false;
			} else {
				this.finalizeToken(this.charType);
				return true;
			}
		} else if (this.tokenType === Type.LineComment) {
			if (this.charType === Type.NewLine) {
				this.finalizeToken(Type.NewLine);
				return true;
			} else {
				this.tokenValue = this.tokenValue + char;
				this.parsed = true;
				this.documentColumn++;
				return false;
			}
		} else if (this.tokenType === Type.BlockComment) {
			if (this.asterisk) { // the previous char is *
				this.asterisk = false;
				if (this.charType === Type.Slash) { // the last two chars are * /
					this.finalizeToken(Type.BlockCommentTerm);
					this.tokenValue = this.tokenValue + '*'; // add the * that was not yet added to the token
					this.documentColumn++;
					return true;
				} else {
					this.tokenValue = this.tokenValue + '*'; // add the * that was not yet added to the token
					this.documentColumn++;
				}
			}
			// do not add a * to the token immediately, it could be the end of a block comment
			if (this.charType === Type.Asterisk) {
				this.asterisk = true;
			} else {
				this.tokenValue = this.tokenValue + char;
				if (this.charType === Type.NewLine) {
					this.documentLine++;
					this.documentColumn = 0;
				} else {
					this.documentColumn++;
				}
			}
			this.parsed = true;
			return false;
		} else if (this.tokenType === Type.String) {
			if (this.charType === Type.DoubleQuotes) {
				this.finalizeToken(Type.DoubleQuotes);
				return true;
			} else {
				this.tokenValue = this.tokenValue + char;
				this.parsed = true;
				if (this.charType === Type.NewLine) {
					this.documentLine++;
					this.documentColumn = 0;
				} else {
					this.documentColumn++;
				}
				return false;
			}
		} else if (this.tokenType === Type.LineCommentInit) {
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			this.finalizeToken(Type.LineComment);
			return true;
		} else if (this.tokenType === Type.BlockCommentInit) {
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			this.finalizeToken(Type.BlockComment);
			return true;
		} else if (this.tokenType === Type.BlockCommentTerm) {
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			this.finalizeToken(0);
			return true;
		} else if (this.tokenType === Type.DoubleQuotes) {
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			if (this.stringOpen) {
				this.stringOpen = false;
				this.finalizeToken(0);
			} else {
				this.stringOpen = true;
				this.finalizeToken(Type.String);
			}
			return true;
		} else if (this.tokenType === Type.Slash || this.tokenType === Type.SemiColon) {
			if (this.tokenType === Type.SemiColon) {
				this.tokenType = Type.LineCommentInit;
				return false;
			}
			else if (this.firstSlash) {
				this.firstSlash = false;
				if (this.charType === Type.Slash) {
					this.tokenType = Type.LineCommentInit;
					return false;
				} else if (this.charType === Type.Asterisk) {
					this.tokenType = Type.BlockCommentInit;
					return false;
				} else {
					this.finalizeToken(this.charType);
					return true;
				}
			} else {
				this.firstSlash = true;
				this.tokenValue = this.tokenValue + char;
				this.parsed = true;
				this.documentColumn++;
				return false;
			}
		} else if (this.tokenType === Type.NewLine) {
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentLine++;
			this.documentColumn = 0;
			this.finalizeToken(0);
			return true;
		} else if (this.tokenType > 10) { // all other token types
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			this.finalizeToken(0);
			return true;
		} else if (this.tokenType === -1) { // undefined
			this.tokenValue = this.tokenValue + char;
			this.parsed = true;
			this.documentColumn++;
			this.finalizeToken(0);
			return true;
		}
		return false;
	}

	finalizeToken(newType: number): void {
		this.token = new Token(this.tokenType, this.tokenValue, this.tokenPosition);
		this.tokenType = newType;
		this.tokenValue = '';
		this.tokenPosition = { line: this.documentLine, character: this.documentColumn };
	}
}

function getType(c: string): Type {
	const charCode: number = c.charCodeAt(0);
	// Find a better way to incorporate the %
	if (charCode >= 65 && charCode <= 90 || charCode >= 97 && charCode <= 122 || charCode === 37) {
		return Type.Alphanumeric;
	} else if (charCode >= 48 && charCode <= 57) {
		return Type.Numeric;
	} else if (charCode === 34) {
		return Type.DoubleQuotes;
	} else if (charCode === 47) {
		return Type.Slash;
	} else if (charCode === 9) {
		return Type.Tab;
	} else if (charCode === 10) {
		return Type.NewLine;
	} else if (charCode === 32) {
		return Type.Space;
	} else if (charCode === 33) {
		return Type.ExclamationMark;
	} else if (charCode === 35) {
		return Type.NumberSign;
	} else if (charCode === 36) {
		return Type.DollarSign;
		// } else if (charCode === 37) {
		// 	return Type.PercentSign;
	} else if (charCode === 38) {
		return Type.Ampersand;
	} else if (charCode === 39) {
		return Type.SingleQuote;
	} else if (charCode === 40) {
		return Type.OpenParen;
	} else if (charCode === 41) {
		return Type.CloseParen;
	} else if (charCode === 42) {
		return Type.Asterisk;
	} else if (charCode === 43) {
		return Type.PlusSign;
	} else if (charCode === 44) {
		return Type.Comma;
	} else if (charCode === 45) {
		return Type.MinusSign;
	} else if (charCode === 46) {
		return Type.Period;
	} else if (charCode === 58) {
		return Type.Colon;
	} else if (charCode === 59) {
		return Type.SemiColon;
	} else if (charCode === 60) {
		return Type.LessThan;
	} else if (charCode === 61) {
		return Type.EqualSign;
	} else if (charCode === 62) {
		return Type.GreaterThan;
	} else if (charCode === 63) {
		return Type.QuestionMark;
	} else if (charCode === 64) {
		return Type.AtSymbol;
	} else if (charCode === 91) {
		return Type.OpenBracket;
	} else if (charCode === 92) {
		return Type.Backslash;
	} else if (charCode === 93) {
		return Type.CloseBracket;
	} else if (charCode === 94) {
		return Type.Caret;
	} else if (charCode === 95) {
		return Type.Underscore;
	} else if (charCode === 96) {
		return Type.BackQuote;
	} else if (charCode === 123) {
		return Type.OpenBrace;
	} else if (charCode === 124) {
		return Type.Pipe;
	} else if (charCode === 125) {
		return Type.CloseBrace;
	} else if (charCode === 126) {
		return Type.Tilde;
	}
	else {
		return Type.Undefined;
	}
}

export const enum Type {
	Alphanumeric = 1,
	Numeric = 2,
	LineComment = 3,
	BlockComment = 4,
	String = 5,
	LineCommentInit = 6,
	BlockCommentInit = 7,
	BlockCommentTerm = 8,
	DoubleQuotes = 9,
	Slash = 10,

	Tab = 11,
	NewLine = 13,
	Space = 32,
	ExclamationMark = 33,
	NumberSign = 35,
	DollarSign = 36,
	// PercentSign = 37,
	Ampersand = 38,
	SingleQuote = 39,
	OpenParen = 40,
	CloseParen = 41,
	Asterisk = 42,
	PlusSign = 43,
	Comma = 44,
	MinusSign = 45,
	Period = 46,
	Colon = 58,
	SemiColon = 59,
	LessThan = 60,
	EqualSign = 61,
	GreaterThan = 62,
	QuestionMark = 63,
	AtSymbol = 64,
	OpenBracket = 91,
	Backslash = 92,
	CloseBracket = 93,
	Caret = 94,
	Underscore = 95,
	BackQuote = 96,
	OpenBrace = 123,
	Pipe = 124,
	CloseBrace = 125,
	Tilde = 126,

	Undefined = -1,
}
