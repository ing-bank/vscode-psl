import {Socket} from 'net';

export default class HostSocket {
	socket: Socket;

	constructor() {
		this.socket = new Socket();
	}

	// resolves when done with no value
	connect(port: number, host: string): Promise<void> {
		this.onClose();
		return new Promise((resolve, reject) => {
			this.socket.connect(port, host, () => {
				resolve();
			})
			this.socket.once('error', (err: Error) => {
				this.closeConnection();
				reject(err);
			})
		})
	}

	closeConnection() {
		this.socket.removeAllListeners();
		this.socket.destroy();
	}


	onceData(): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			this.socket.once('data', (ret) => {
				this.socket.removeAllListeners();
				resolve(ret);
			})
			this.socket.once('error', (ret) => {
				this.socket.removeAllListeners();
				reject(ret.message);
			})
		})
	}

	onClose(): Promise<Boolean> {
		return new Promise(resolve => {
			this.socket.once('close', (had_error) => {
				resolve(had_error);
			})
		})
	}

	send(messageString: string): Promise<void> {
		return new Promise(resolve => {
			this.socket.write(messageString, 'ascii', () => {
				resolve();
			});
		})
	}
}
