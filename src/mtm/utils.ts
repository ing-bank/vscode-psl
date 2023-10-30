import * as os from 'os';
import * as path from 'path';
import * as encode from '../common/encode';

interface FileDetails {
	fileId: string
	fileName: string
	fileBaseName: string
}

export const extensionToDescription: { [key: string]: string } = {
	'BATCH': 'Batch',
	'COL': 'Column',
	'DAT': 'Data',
	'FKY': 'Foreign Key',
	// 'G': 'Global',
	'IDX': 'Index',
	'JFD': 'Journal',
	'm': 'M routine',
	'PPL': 'Pre Post Lib',
	'PROC': 'Procedure',
	'properties': 'properties file',
	'PSL': 'psl File',
	'psl': 'psl File',
	'pslx': 'pslx File',
	'pslxtra': 'pslxtra File',
	'psql': 'PSQLScript',
	'serial': 'Serialized Data',
	'QRY': 'Query',
	'RPT': 'Report',
	'SCR': 'Screen',
	// TABLE not supported
	// 'TABLE': 'Complete Table',
	'TBL': 'Table',
	'TRIG': 'Trigger',
}

export function v2lvFormat(messageValue: string[]) {
	let lvMessage = ''
	if (messageValue.length !== 0) {
		messageValue.forEach(messageString => {
			lvMessage = lvMessage + lvFormat(messageString)
		})
	}
	return lvMessage
}

export function lvFormat(messagString: String): string {
	let returnLvFormat = ''
	let lvArray = []
	let messageLength = messagString.length
	let splitBytes

	if (messageLength < 255) { splitBytes = 1 }
	else if (messageLength < 65534) { splitBytes = 2 }
	else if (messageLength < 16777213) { splitBytes = 3 }
	else { splitBytes = 4 }

	messageLength = splitBytes + messageLength

	if (messageLength > 255) {
		for (let loop = 0; loop < splitBytes; loop++) {
			lvArray.push(messageLength % 256)
			messageLength = Math.trunc(messageLength / 256)
		}
		returnLvFormat = String.fromCharCode(0) + String.fromCharCode(splitBytes);
		for (let loop = splitBytes - 1; loop >= 0; loop--) {
			returnLvFormat = returnLvFormat + String.fromCharCode(lvArray[loop])
		}
	}
	else { returnLvFormat = String.fromCharCode(messageLength) }
	return (returnLvFormat + messagString);
}

/**
 * This method does a thing.
 *
 * @export
 * @param {Buffer} messageString The message string
 * @returns {Buffer[]} A buffer array
 */
export function lv2vFormat(messageString: Buffer): Buffer[] {
	let returnString: Buffer[] = [];
	let messageLength = messageString.length;

	if (messageLength === 0) { return [] };

	let bytePointer: number = 0;
	let extractChar: number = 0;
	let numberOfBufferedLine: number = 0;
	let byteCalcNumber: number;

	while (bytePointer < messageLength) {
		extractChar = messageString.readUInt8(bytePointer);

		numberOfBufferedLine = 1;

		if (extractChar === 0) {
			numberOfBufferedLine = messageString.readUInt8(bytePointer + 1);
			bytePointer = bytePointer + 2;
			if (numberOfBufferedLine === 0) {
				continue;
			}
			byteCalcNumber = 1;
			for (let loopFor = numberOfBufferedLine - 1; loopFor >= 0; loopFor--) {
				extractChar = (messageString.readUInt8(bytePointer + loopFor) * byteCalcNumber) + extractChar;
				byteCalcNumber = byteCalcNumber * 256
			}
		}
		if (bytePointer > messageLength) {
			continue;
		}
		returnString.push(messageString.slice(bytePointer + numberOfBufferedLine, bytePointer + extractChar));
		bytePointer = bytePointer + extractChar;
	}
	return returnString
}

export function parseResponse(serviceClass: number, outputData: Buffer, encoding: BufferEncoding): string {
	// unpacking multiple times to get the token, remove the endiness by extracting from position 2
	let returnString: string = ''
	let returnArray: Buffer[];
	returnArray = lv2vFormat(outputData);
	returnArray = lv2vFormat(returnArray[1]);
	returnArray = lv2vFormat(returnArray[1]);
	//orig: returnString = returnArray[0].toString(encoding)
	returnString = encode.bufferToString(returnArray[0], encoding)
	if (returnString === 'ER') {
		//orig: throw returnArray.map(x => x.toString(encoding)).join('')
		throw returnArray.map(x => encode.bufferToString(x, encoding)).join('')
	}
	if (serviceClass === 5) {
		//orig: returnString = returnArray[2].toString(encoding) + String.fromCharCode(0) + returnArray[3].toString(encoding)
		returnString = encode.bufferToString(returnArray[2], encoding) + String.fromCharCode(0) + encode.bufferToString(returnArray[3], encoding)		
	}
	return returnString;
}

export function sendingMessage(tokenMessage: string, mrpcMessage: string): string {
	return v2lvFormat([tokenMessage, mrpcMessage])
}

export function mrpcMessage(mrpcId: string, version: string, prepareString: string): string {
	let exchangeMessage = [
		mrpcId,
		version,
		prepareString,
		mrpcConnMessage()
	];
	return v2lvFormat(exchangeMessage);
}


export function tokenMessage(serviceClass: number, token: string, messageId: number): string {
	let exchangeMessage = [
		serviceClass.toString(),
		token,
		messageId.toString(),
		'0',
		''
	]
	return v2lvFormat(exchangeMessage);
}


export function connectionObject(envUser: string, envPassword: string): string {
	let perpareString: string[] = [
		'1',
		envUser.toString(),
		'nowhere',
		envPassword,
		'',
		'',
		netConnMessage()
	]
	return v2lvFormat(perpareString);
}

export function checkObject(localFile: string, token: string): string {
	let messageArray = [
		'CHECKOBJ',
		'', '', localFile, '', '', token
	];
	return v2lvFormat(messageArray);
}

export function saveObject(localFile: string, token: string, username: string): string {
	let messageArray = [
		'SAVEOBJ',
		'', '', localFile, '', '', token, username
	];
	return v2lvFormat(messageArray);
}

export function initCodeObject(code: string, compilationToken: string): string {
	let messageArray = [
		'INITCODE',
		code, compilationToken
	];
	return v2lvFormat(messageArray);
}

export function testCompileObject(fileName: string, compilationToken: string): string {
	let messageArray = [
		'EXECCOMP',
		'', compilationToken, fileName
	];
	return v2lvFormat(messageArray);
}

export function initObject(objectId: string, objectName: string): string {
	let messageArray = [
		'INITOBJ',
		'', '', '', objectId, objectName
	];
	return v2lvFormat(messageArray);
}

export function retObject(token: string): string {
	let messageArray = [
		'RETOBJ',
		'', '', '', '', '', token
	];
	return v2lvFormat(messageArray);
}

export function preCompileObject(fileName: string): string {
	let messageArray = [
		'PRECMP',
		'', '', fileName
	];
	return v2lvFormat(messageArray);
}

export function compileObject(compilationToken: string): string {
	let messageArray = [
		'CMPLINK',
		'', compilationToken
	]
	return v2lvFormat(messageArray);
}

export function pslRunObject(compilationToken: string): string {
	let messageArray = [
		'PSLRUN',
		'', compilationToken
	];
	return v2lvFormat(messageArray);
}

export function customRunObject(request: string, compilationToken: string): string {
	let messageArray = [
		request,
		'', compilationToken
	];
	return v2lvFormat(messageArray);
}

export function sqlObject(query: string, rows: string) {
	let messageArray = [
		query,
		rows,
		''
	]
	return v2lvFormat(messageArray);
}

export function batchCompileObject(dbtblTableName: string, elementName: string): string {
	let messageArray = [
		dbtblTableName,
		elementName
	]
	return v2lvFormat(messageArray);
}

export function getPslCls(): string {
	let messageArray = [
		'GETPSLCLS', '', ''
	];
	return v2lvFormat(messageArray);
}

export function getUserName(): string {
	return os.userInfo().username;
}

export function getObjectType(fileName: string): FileDetails {
	let elementBaseName: string = path.basename(fileName)
	let elementName = elementBaseName.substr(0, elementBaseName.lastIndexOf('.'))
	let elementExtension = elementBaseName.substr(elementBaseName.lastIndexOf('.') + 1, elementBaseName.length)
	if (elementName.includes('.')) elementName = elementBaseName;
	return {
		fileId: getFileDetails(elementExtension),
		fileName: elementName,
		fileBaseName: elementBaseName
	}
}

function getFileDetails(fileExtension: string) {
	if (fileExtension in extensionToDescription) return extensionToDescription[fileExtension];
	throw new Error(`Invalid file extension: ${fileExtension}`);

}

export function getDbtblInfo(fileId: string): string {
	switch (fileId) {
		case 'Batch': return 'DBTBL33';
		case 'Column': return 'DBTBL25';
		case 'Procedure': return 'DBTBL1';
		case 'Table': return 'DBTBL1';
		default: return 'Unknown Type';
	}
}

export function pack(totalLength: number): string {
	// For ING we use Big Endian !h which is 2 bytes
	let quotient = Math.floor(totalLength / 256);
	let firstByte = String.fromCharCode(quotient);
	let secondByte = String.fromCharCode(totalLength - (quotient * 256));
	return (firstByte + secondByte);
}

export function unpack(message: Buffer): { totalBytes: number, startByte: number } {
	// For ING we use Big Endian !h which is 2 bytes
	if (!message.readUInt8(0) && !message.readUInt8(1)) return longMessageLength(message);
	return { totalBytes: (message.readUInt8(0) * 256) + message.readUInt8(1), startByte: 3 };
}

function longMessageLength(message: Buffer): { totalBytes: number, startByte: number } {
	// the third byte of the message tells us how many bytes are used to encode the length
	const numberOfBytes = message.readUInt8(2);
	const lastLengthByte = 3 + numberOfBytes;

	// slice the message to just use the bytes that encode message length
	const messageLengthBytes = message.slice(3, lastLengthByte);
	let totalBytes = 0;
	for (let index = 0; index < messageLengthBytes.length; index++) {
		const byte = messageLengthBytes.readUInt8(index);
		totalBytes += byte * 256 ** (messageLengthBytes.length - 1 - index);
	}
	return { totalBytes, startByte: lastLengthByte + 1};
}

function mrpcConnMessage(): string {
	return String.fromCharCode(4, 3, 2) + '1';
}

function netConnMessage(): string {
	return String.fromCharCode(21, 2) + '5' + String.fromCharCode(6) + 'ICODE' + String.fromCharCode(2) + '1' + String.fromCharCode(8) + 'PREPARE' + String.fromCharCode(2) + '3';
}
