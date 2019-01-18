import HostSocket from './hostSocket';
import * as utils from './utils';
import * as fs from 'fs';

/*
	socket.serviceClass:
	0 - Connection
	3 - MRPC
	5 - SQL
*/

export class MtmConnection {
	private mrpcId: string;

	private socket: HostSocket = new HostSocket()
	private serverType: string = 'SCA$IBS';
	private encoding: BufferEncoding = 'utf8';
	private messageByte: string = String.fromCharCode(28);
	private token: string = '';
	private messageId: number = 0;
	private serviceClass: number = 0;
	private maxRow: number = 30;
	private isSql: boolean = false;
	private recordCount: number = 0;

	private constructor(mrpcId: string, serviceClass: number, serverType?: string, encoding?: BufferEncoding) {
		this.mrpcId = mrpcId;
		this.serviceClass = serviceClass;
		if (serverType) this.serverType = serverType;
		if (encoding) this.encoding = encoding;
	}

	static getSocket(mrpcId: string, serviceClass: number, servertype?: string, encoding?: BufferEncoding) {
		return new MtmConnection(mrpcId, serviceClass, servertype, encoding);
	}

	async open(host: string, port: number, profileUsername: string, profilePassword: string) {
		await this.socket.connect(port, host);
		let prepareString = utils.connectionObject(profileUsername, profilePassword);
		let returnArray = await this.execute(0, prepareString);
		this.token = returnArray;
	}

	async send(fileName: string) {
		try {
			let codeToken = await this.sendToProfile(fileName)
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

	async test(fileName: string) {
		try {
			let codeToken = await this.sendToProfile(fileName)
			let returnString = await this.testCompile(fileName, codeToken)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async get(fileName: string) {
		try {
			let returnString = await this.getFromProfile(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async complink(fileName: string) {
		try {
			let returnString = await this.compileAndLink(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async run(fileName: string) {
		try {
			let codeToken = await this.sendToProfile(fileName)
			let returnString = await this.pslRun(codeToken)
			return returnString
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
			let returnString = await this.getTableFromHost(fileName)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async sql(query: string) {
		try {
			this.isSql = true
			let returnString = await this.sqlQuery(query)
			return returnString
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	async getPSLClasses() {
		try {
			let returnString = await this.pslClasses();
			return returnString;
		}
		catch (err) {
			this.close();
			throw new Error(err.toString());
		}
	}

	private async sendToProfile(filename: string) {
		let returnString: string;
		let fileString: string = await readFileAsync(filename, {encoding: this.encoding}) as string;
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
			returnString = await this.execute(this.serviceClass, prepareString)
			codeToken = returnString;
		}
		let prepareString: string = utils.initCodeObject('', codeToken)
		returnString = await this.execute(this.serviceClass, prepareString)
		return returnString;
	}

	private async saveInProfile(fileName: string, codeToken: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.saveObject(fileDetails.fileBaseName, codeToken, utils.getUserName())
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString
	}

	private async testCompile(fileName: string, codeToken: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.testCompileObject(fileDetails.fileBaseName, codeToken)
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString
	}

	private async getFromProfile(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.initObject(fileDetails.fileId, fileDetails.fileName)
		returnString = await this.execute(this.serviceClass, prepareString);
		let codeToken = returnString.split('\r\n')[1];
		let hasMore = '1'
		returnString = ''
		while (hasMore === '1') {
			prepareString = utils.retObject(codeToken)
			let nextReturnString = await this.execute(this.serviceClass, prepareString);
			hasMore = nextReturnString.substr(0, 1);
			returnString = returnString + nextReturnString.substr(1, nextReturnString.length);
		}
		return returnString
	}

	private async compileAndLink(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let prepareString = utils.preCompileObject(fileDetails.fileBaseName)
		let codeToken = await this.execute(this.serviceClass, prepareString);
		prepareString = utils.compileObject(codeToken)
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString;
	}

	private async pslRun(codeToken: string) {
		let returnString: string;
		let prepareString = utils.pslRunObject(codeToken)
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString;
	}

	// Batch complie is not working since 81 is not fully exposed from profile
	private async batchCompileAndLink(fileName: string) {
		let returnString: string;
		let fileDetails = utils.getObjectType(fileName);
		let dbtblTableName = utils.getDbtblInfo(fileDetails.fileId);
		let prepareString = utils.batchCompileObject(dbtblTableName, fileDetails.fileName)
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString;
	}

	private async getTableFromHost(fileName: string) {
		let returnString: string;
		let columnList: string[];
		let fileDetails = utils.getObjectType(fileName);
		let tableReturnString = fileDetails.fileBaseName + String.fromCharCode(1) + await this.getFromProfile(fileName)
		let selectStatement = `SELECT COUNT(DI) FROM DBTBL1D WHERE FID='${fileDetails.fileName}' `;
		this.recordCount = Number(await this.sqlQuery(selectStatement))
		selectStatement = `SELECT DI FROM DBTBL1D WHERE FID='${fileDetails.fileName}'`;
		returnString = await this.sqlQuery(selectStatement)
		columnList = returnString.split('\r\n');
		returnString = tableReturnString
		for (let i = 0; i < columnList.length; i++) {
			fileName = fileDetails.fileName + '-' + columnList[i] + '.COL'
			returnString = returnString + String.fromCharCode(0) + fileName + String.fromCharCode(1) + await this.getFromProfile(fileName)
		}
		return returnString;
	}

	private async sqlQuery(selectQuery: string) {
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
		let returnString = await this.execute(5, prepareString);
		return returnString
	}

	private async fetchSqlCursor(cursorNumber: string) {
		let fetchCursor = 'FETCH ' + cursorNumber;
		let rows = 'ROWS=' + this.maxRow;
		let prepareString = utils.sqlObject(fetchCursor, rows)
		let returnString = await this.execute(5, prepareString);
		let splitReturnSring: string[] = returnString.split(String.fromCharCode(0))
		let totalCount = Number(splitReturnSring[0]);
		returnString = splitReturnSring[1];
		if (this.isSql === false) {
			while ((totalCount < this.recordCount)) {
				splitReturnSring = [];
				let nextReturnString = await this.execute(5, prepareString);
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
		let returnString = await this.execute(5, prepareString);
		return returnString
	}

	private async pslClasses() {
		let returnString: string;
		let prepareString = utils.getPslCls()
		returnString = await this.execute(this.serviceClass, prepareString);
		return returnString;
	}

	private async execute(serviceClass: number, prepareString: string): Promise<string> {
		return this.executeMRPC(serviceClass, prepareString).then((output) => {
			return output;
		})
	}

	private async executeMRPC(serviceClass: number, prepareString: string): Promise<string> {
		let sendingMessage = this.prepareSendingMessage(serviceClass, prepareString);
		await this.socket.send(sendingMessage);
		let message = await this.socket.onceData();
		let totalBytes = utils.unpack(message.readUInt8(0), message.readUInt8(1))
		let messageLength = message.length

		while (messageLength < totalBytes) {
			let nextMessage = await this.socket.onceData();
			messageLength = messageLength + nextMessage.length;
			message = Buffer.concat([message, nextMessage], messageLength)
		}
		return (utils.parseResponse(serviceClass, message.slice(3, message.length), this.encoding));
	}

	private prepareSendingMessage(serviceClass: number, prepareString: string): string {
		let tokenMessage = utils.tokenMessage(serviceClass, this.token, this.messageId);
		if (serviceClass === 3) {
			let version: number = 1;
			prepareString = utils.mrpcMessage(this.mrpcId, version.toString(), prepareString)
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
		fs.readFile(file, options, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

/*
======================================================================
Only for testing purpose - Enable the below commented code for testing
======================================================================
*/

// Default entry point

// (function main() {
// 	test();
// })();

// async function test() {
// 	let mtm = new MtmConnection()
// 	let returnString;
// 	try {
// 		await mtm.open('xxx', 999, 'xxx', 'yyyy', 3)
// 		returnString = await mtm.run('C:\\xxxx\\xxxx\\workspace\\ProfileHost\\test\\psl\\utgood\\xxxx.psl')
// 		await mtm.close()
// 	}
// 	catch (err) {
// 		returnString = err;
// 	}

// 	console.log(returnString)
// }
