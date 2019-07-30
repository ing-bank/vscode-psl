import * as path from 'path';
import { Disposable, ExtensionContext, Memento, Uri, ViewColumn, Webview,
		WebviewPanel, WebviewPanelOnDidChangeViewStateEvent, window, workspace } from 'vscode';
import LocalWebService from './localWebService';
import {previewManager} from './previewManager';

export default abstract class BasePreview {

	get visible(): boolean {
		return this._panel.visible;
	}

	get webview(): Webview {
		return this._panel.webview;
	}

	get storage(): Memento {
		return this._storage;
	}

	get state(): any {
		return this.storage.get(this.previewUri.toString());
	}

	get theme(): string {
		return workspace.getConfiguration('dat-preview').get('theme') as string;
	}

	get uri(): Uri {
		return this._uri;
	}

	get previewUri(): Uri {
		return this._previewUri;
	}

	get serviceUrl(): string {
		return this._service.serviceUrl;
	}

	get service(): LocalWebService {
		return this._service;
	}

	abstract get html(): string;
	abstract get options(): any;
	abstract set options(options: any);

	public _panel: WebviewPanel;
	protected _disposables: Disposable[] = [];
	private _storage: Memento;
	private _uri: Uri;
	private _previewUri: Uri;
	private _title: string;
	private _service: LocalWebService;

	constructor(context: ExtensionContext, uri: Uri, scheme: string, viewColumn: ViewColumn) {
		this._storage = context.workspaceState;
		this._uri = uri;
		this.initWebview(scheme, viewColumn);
		this._service = new LocalWebService(context);
		this.initService();
	}

	public isDisposed(): boolean {
		if (this._disposables.length === 0) {
			return true;
		}
		return false;
	}

	// Updates the content displayed in the WebView
	public update(content: string, options: any) {
		this._service.init(content, options);
		this.webview.html = this.html;
	}

	public getOptions(): any {
		return {
			state: this.state,
			uri: this.previewUri.toString(),
		};
	}

	public updateOptions() {
		const options = this.getOptions();
		this.service.options = options;
	}

	public configure() {
		const options = this.getOptions();
		this.service.options = options;
		this.webview.html = this.html;
		this.refresh(options);
	}

	public reveal(): void {
		this._panel.reveal();
	}
	abstract refresh(options: any): void;

	// Configures the WebView panel to be displayed
	private initWebview(scheme: string, viewColumn: ViewColumn) {
		this._previewUri = this._uri.with({
			scheme,
		});
		this._title = `Edit '${path.basename(this._uri.fsPath)}'`;
		this._panel = window.createWebviewPanel(
			'psl-tabledataviewer',
			this._title,
			viewColumn,
			{
				enableCommandUris: true,
				enableFindWidget: true,
				enableScripts: true,
				retainContextWhenHidden: false,
			},
		);
		this._panel.onDidDispose(() => {
			this.dispose();
		}, null, this._disposables);
		this._panel.onDidChangeViewState((e: WebviewPanelOnDidChangeViewStateEvent) => {
			// const active = e.webviewPanel.visible;
		}, null, this._disposables);
		this.webview.onDidReceiveMessage((e) => {
			if (e.error) {
				window.showErrorMessage(e.error);
			}
		}, null, this._disposables);
		if (!previewManager.find(this.previewUri)) {
			// previewManager.add(this);
		}
	}

	// Creates and starts a LocalWebService
	private initService(): void {
		this._service.start();
	}

	// Disposes of the resources used by the WebView
	private dispose(): void {
		this._panel.dispose();
		while (this._disposables.length) {
			const item = this._disposables.pop();
			if (item) {
				item.dispose();
			}
		}
	}
}
