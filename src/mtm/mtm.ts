import HostSocket from './hostSocket';
import * as utils from './utils';
import * as fs from 'fs';
import * as encode from '../common/encode';

enum ServiceClass {
	CONNECTION = 0,
	MRPC = 3,
	SQL = 5,
}

interface ServiceDetail {
	serviceClass: ServiceClass;
	mrpcID?: string;
}

export class MtmConnection {

	private socket: HostSocket = new HostSocket()
	private messageByte: string = String.fromCharCode(28);
	private token: string = '';
	private messageId: number = 0;
	private maxRow: number = 30;
	private isSql: boolean = false;
	private recordCount: number = 0;

	constructor(private serverType: string = 'SCA$IBS', private encoding: BufferEncoding = 'utf8') { }

	async open(host: string, port: number, profileUsername: string, profilePassword: string) {
		await this.socket.connect(port, host);
		let prepareString = utils.connectionObject(profileUsername, profilePassword);
		let returnArray = await this.execute({ serviceClass: ServiceClass.CONNECTION }, prepareString);
		this.token = returnArray;
	}

	async send(fileName: string) {
		try {
			let codeToken = await this._send(fileName)
			let returnString = await this.saveInProfile(fileName, codeToken)
			if (returnString !== '1') {
				throw new Error(returnString.split('\r\n')[1]);
			}
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async testCompile(fileName: string) {
		try {
			let codeToken = await this._send(fileName)
			let returnString = await this._testCompile(fileName, codeToken)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async get(fileName: string) {
		try {
			let returnString = await this._get(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async compileAndLink(fileName: string) {
		try {
			let returnString = await this._compileAndLink(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async runPsl(fileName: string) {
		try {
			let codeToken = await this._send(fileName)
			let returnString = await this._runPsl(codeToken)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async runCustom(fileName: string, mrpcID: string, request: string) {
		try {
			const codeToken = await this._send(fileName);
			const returnString = await this._runCustom(codeToken, mrpcID, request);
			return returnString;
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async close() {
		this.socket.closeConnection();
		return this.socket.socket.destroyed;
	}

	async batchcomp(fileName: string) {
		try {
			let returnString = await this.batchCompileAndLink(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async getTable(fileName: string) {
		try {
			this.isSql = false
			let returnString = await this._getTable(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async sqlQuery(query: string) {
		try {
			this.isSql = true
			let returnString = await this._sqlQuery(query)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async getPSLClasses() {
		try {
			let returnString = await this._getPslClasses();
			return returnString;
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	private async _send(filename: string) {
		let returnString: string;
		// orig: let fileString: string = (await readFileAsync(filename, {encoding: this.encoding})).toString(this.encoding);
		let fileContent = await readFileAsync(filename);		
		let fileString: string;
		if (Buffer.isBuffer(fileContent)) {
			fileString = encode.bufferToString(fileContent, this.encoding);
		} else {
			fileString = fileContent;
		}
		let fileContentLength: number = fileString.length;
		let totalLoop: number = Math.ceil(fileContentLength / 1024);
		let codeToken: string = '';
		for (let i = 0; i < totalLoop; i++) {
			let partialString: string = fileString.slice(i * 1024, (i * 1024) + 1024);
			let withPipe: string = '';
			for (const char of partialString) {
				withPipe += char.charCodeAt(0) + '|';
			}
			let prepareString: string = utils.initCodeObject(withPipe, codeToken)
			returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString)
			codeToken = returnString;
		}
		let prepareString: string = utils.initCodeObject('', codeToken)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString)
		return returnString;
	}

	private async saveInProfile(fileName: string, codeToken: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.saveObject(fileDetails.fileBaseName, codeToken, utils.getUserName())
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString
	}

	private async _testCompile(fileName: string, codeToken: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.testCompileObject(fileDetails.fileBaseName, codeToken)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString
	}

	private async _get(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.initObject(fileDetails.fileId, fileDetails.fileName)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		let codeToken = returnString.split('\r\n')[1];
		let hasMore = '1'
		returnString = ''
		while (hasMore === '1') {
			prepareString = utils.retObject(codeToken)
			let nextReturnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
			hasMore = nextReturnString.substr(0, 1);
			returnString = returnString + nextReturnString.substr(1, nextReturnString.length);
		}
		return returnString
	}

	private async _compileAndLink(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.preCompileObject(fileDetails.fileBaseName)
		let codeToken = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		prepareString = utils.compileObject(codeToken)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString;
	}

	private async _runPsl(codeToken: string) {
		let returnString: string;
		let prepareString = utils.pslRunObject(codeToken)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString;
	}

	private async _runCustom(codeToken: string, mrpcID: string, request: string) {
		let returnString: string;
		let prepareString = utils.customRunObject(request, codeToken);
		returnString = await this.execute({ mrpcID, serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString;
	}

	// Batch complie is not working since 81 is not fully exposed from profile
	private async batchCompileAndLink(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let dbtblTableName = utils.getDbtblInfo(fileDetails.fileId);
		let prepareString = utils.batchCompileObject(dbtblTableName, fileDetails.fileName)
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString;
	}

	private async _getTable(fileName: string) {
		let returnString: string;
		let columnList: string[];
		let fileDetails = utils.getObjectType(fileName);
		let tableReturnString = fileDetails.fileBaseName + String.fromCharCode(1) + await this._get(fileName)
		let selectStatement = `SELECT COUNT(DI) FROM DBTBL1D WHERE FID='${fileDetails.fileName}' `;
		this.recordCount = Number(await this._sqlQuery(selectStatement))
		selectStatement = `SELECT DI FROM DBTBL1D WHERE FID='${fileDetails.fileName}'`;
		returnString = await this._sqlQuery(selectStatement)
		columnList = returnString.split('\r\n');
		returnString = tableReturnString
		for (let i = 0; i < columnList.length; i++) {
			fileName = fileDetails.fileName + '-' + columnList[i] + '.COL'
			returnString = returnString + String.fromCharCode(0) + fileName + String.fromCharCode(1) + await this._get(fileName)
		}
		return returnString;
	}

	private async _sqlQuery(selectQuery: string) {
		selectQuery = selectQuery.toUpperCase()
		if (!selectQuery.startsWith('SELECT')) {
			throw new Error('Not a select query');
		}
		let cursorNumber = new Date().getTime().toString()
		let returnString = await this.openSqlCursor(cursorNumber, selectQuery)
		returnString = await this.fetchSqlCursor(cursorNumber)
		await this.closeSqlCursor(cursorNumber)
		return returnString;
	}

	private async openSqlCursor(cursorNumber: string, selectQuery: string) {
		let openCursor = 'OPEN CURSOR ' + cursorNumber + ' AS ';
		let rows = '';
		let prepareString = utils.sqlObject(openCursor + selectQuery, rows)
		let returnString = await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
		return returnString
	}

	private async fetchSqlCursor(cursorNumber: string) {
		let fetchCursor = 'FETCH ' + cursorNumber;
		let rows = 'ROWS=' + this.maxRow;
		let prepareString = utils.sqlObject(fetchCursor, rows)
		let returnString = await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
		let splitReturnSring: string[] = returnString.split(String.fromCharCode(0))
		let totalCount = Number(splitReturnSring[0]);
		returnString = splitReturnSring[1];
		if (this.isSql === false) {
			while ((totalCount < this.recordCount)) {
				splitReturnSring = [];
				let nextReturnString = await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
				splitReturnSring = nextReturnString.split(String.fromCharCode(0))
				totalCount = totalCount + Number(splitReturnSring[0]);
				returnString = returnString + '\r\n' + splitReturnSring[1]
			}
		}
		return returnString
	}

	private async closeSqlCursor(cursorNumber: string) {
		let closeCursor = 'CLOSE ' + cursorNumber;
		let prepareString = utils.sqlObject(closeCursor, '')
		let returnString = await this.execute({ serviceClass: ServiceClass.SQL }, prepareString);
		return returnString
	}

	private async _getPslClasses() {
		let returnString: string;
		let prepareString = utils.getPslCls()
		returnString = await this.execute({ mrpcID: '121', serviceClass: ServiceClass.MRPC }, prepareString);
		return returnString;
	}

	private async execute(detail: ServiceDetail, prepareString: string): Promise<string> {
		const sendingMessage = this.prepareSendingMessage(detail, prepareString);
		await this.socket.send(sendingMessage);
		let message = await this.socket.onceData();
		const { totalBytes, startByte } = utils.unpack(message);
		let messageLength = message.length;

		while (messageLength < totalBytes) {
			const nextMessage = await this.socket.onceData();
			messageLength = messageLength + nextMessage.length;
			message = Buffer.concat([message, nextMessage], messageLength);
		}
		return (utils.parseResponse(detail.serviceClass, message.slice(startByte, message.length), this.encoding));
	}

	private prepareSendingMessage(detail: ServiceDetail, prepareString: string): string {
		let tokenMessage = utils.tokenMessage(detail.serviceClass, this.token, this.messageId);
		if (detail.serviceClass === ServiceClass.MRPC) {
			let version: number = 1;
			prepareString = utils.mrpcMessage(detail.mrpcID, version.toString(), prepareString)
		}
		let sendingMessage = utils.sendingMessage(tokenMessage, prepareString);
		sendingMessage = this.serverType + this.messageByte + sendingMessage
		sendingMessage = utils.pack(sendingMessage.length + 2) + sendingMessage;
		this.messageId++;
		return sendingMessage;
	}
}

function readFileAsync(file: string, options?: {encoding?: string, flag?: string}): Promise<Buffer | string> {
	return new Promise((resolve, reject) => {
		fs.readFile(file, {encoding: null, flag: options.flag}, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}
