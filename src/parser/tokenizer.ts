export function* getTokens(documentContents: string): IterableIterator<Token> {
	let t: Tokenizer = new Tokenizer();

	for (let char of documentContents) {
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

export interface Token {
	type: Type,
	value: string,
	position: Position;
}

export interface Position {
	line: number,
	character: number;
}

class Tokenizer {
	documentLine: number;
	documentColumn: number;

	charType: number;
	tokenType: number;
	tokenValue: string;
	tokenPosition: Position;
	token: Token;

	parsed: boolean
	stringOpen: boolean;
	firstSlash: boolean;
	asterisk: boolean;

	constructor() {
		this.documentLine = 0;
		this.documentColumn = 0;

		this.charType = 0;
		this.tokenType = 0;
		this.tokenValue = '';
		this.tokenPosition = {line: this.documentLine, character: this.documentColumn};

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
			if (this.charType === Type.Asterisk) { // do not add a * to the token immediately, it could be the end of a block comment
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
		} else if (this.tokenType === Type.Slash) {
			if (this.firstSlash) {
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
		this.token = {type: this.tokenType, value: this.tokenValue, position: this.tokenPosition};
		this.tokenType = newType;
		this.tokenValue = '';
		this.tokenPosition = {line: this.documentLine, character: this.documentColumn};
	}
}

function getType(c: string): Type {
	let charCode: number = c.charCodeAt(0);
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
		return -1;
	}
}

export enum Type {
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

	Undefined = -1
}