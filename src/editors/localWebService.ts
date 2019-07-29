import bodyParser = require('body-parser');
import cors = require('cors');
import express = require('express');
import fs = require('fs');
import http = require('http');
import path = require('path');
import { ExtensionContext, Uri, window, workspace } from 'vscode';
import { previewManager } from './previewManager';

export default class LocalWebService {

	private app = express();
	private server = http.createServer();
	private _content = '';
	private _options: any;

	private _servicePort: string;
	private _htmlContentLocation = 'out';
	private _staticContentPath: string;

	constructor(context: ExtensionContext) {
		const self = this;

		this._staticContentPath = path.join(context.extensionPath, this._htmlContentLocation);
		this.app.use(cors());
		this.app.use(express.static(this._staticContentPath));
		this.app.use(bodyParser.json());
		this.app.get('/public/state', (res) => {
			const storage = {
				content: self._content,
				options: self._options,
			};
			res.send(storage);
		});
		this.app.post('/public/state', (req, res) => {
			context.workspaceState.update(self._options.uri, req.body);
			self._options.state = req.body;
			res.send(200);
		});
		this.app.get('/public/proxy', (req, res) => {
			const file = req.query.file;
			fs.readFile(file, (err, data) => {
				if (err) {
					res.status(500).send(err.message);
				} else {
					res.send(data);
				}
			});
		});
		this.app.post('/public/settingsUpdate', (req, res) => {
			const uri = Uri.parse(req.body.uri);
			const resource = uri.with({
				scheme: 'dat-preview',
			});
			const prevw = previewManager.find(resource);
			prevw.options.separator = req.body.separator;
			prevw.options.quoteMark = req.body.quoteMark;
			prevw.options.hasHeaders = req.body.hasHeaders;
			prevw.options.capitalizeHeaders = req.body.capitalizeHeaders;
			prevw.options.resizeColumns = req.body.resizeColumns;
			prevw.options.lineNumbers = req.body.lineNumbers;
			prevw.options.commentCharacter = req.body.commentCharacter;
			prevw.options.skipComments = req.body.skipComments;
			prevw.options.formatValues = req.body.formatValues;
			prevw.options.numberFormat = req.body.numberFormat;
			prevw.updateOptions();
			res.send('success');
		});
		this.app.post('/public/getOptions', (res) => {
			const opt = {
				options: self._options,
			};
			res.send(opt);
		});
		this.app.post('/public/saveDocument', (req, res) => {
			const uri = previewManager.find(req.body.uri).previewUri;
			workspace.openTextDocument(uri.path).then((textDocument) => {
				if (textDocument) {
					textDocument.save();
					window.showInformationMessage('The file has been saved succesfully.');
				} else {
					window.showErrorMessage('There was an error in saving the file.');
				}
			});
			res.send(200);
		});
		this.server.on('request', this.app);
	}

	get serviceUrl(): string {
		return 'http://localhost:' + this._servicePort + '/public';
	}

	get content(): string {
		return this._content;
	}

	set content(value: string) {
		this._content = value;
	}

	get options(): any {
		return this._options;
	}

	set options(value: any) {
		this._options = value;
	}

	public init(content: string, options: any) {
		this._content = content;
		this._options = options;
	}

	public start(): void {
		const port = this.server.listen(0).address()['port'];
		this._servicePort = port.toString();
	}
}
