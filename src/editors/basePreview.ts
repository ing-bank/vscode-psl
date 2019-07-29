import { workspace, window, ExtensionContext, Disposable, Uri, ViewColumn, Memento, Webview, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent } from 'vscode';
import * as path from 'path';
import LocalWebService from './localWebService';
import {previewManager} from './previewManager';

export default abstract class BasePreview {
    private _storage: Memento;
    private _uri: Uri;
    private _previewUri: Uri;
    private _title: string;
    public _panel: WebviewPanel;
    private _service: LocalWebService;
    protected _disposables: Disposable[] = [];


    constructor(context: ExtensionContext, uri: Uri, scheme: string, viewColumn: ViewColumn) {
        this._storage = context.workspaceState;
        this._uri = uri;
        this.initWebview(scheme, viewColumn);
        this._service = new LocalWebService(context);
        this.initService();
    }

    // Configures the WebView panel to be displayed
    private initWebview(scheme: string, viewColumn: ViewColumn) {
        this._previewUri = this._uri.with({
            scheme: scheme
        });
        this._title = `Edit '${path.basename(this._uri.fsPath)}'`;
        this._panel = window.createWebviewPanel(
            'psl-tabledataviewer',
            this._title,
            viewColumn,
            {
                enableScripts: true,
                enableCommandUris: true,
                enableFindWidget: true,
                retainContextWhenHidden: false
            }
        );
        this._panel.onDidDispose(()=>{
            this.dispose();
        }, null, this._disposables);
        this._panel.onDidChangeViewState((e: WebviewPanelOnDidChangeViewStateEvent) => {

            let active = e.webviewPanel.visible;
        }, null, this._disposables);
        this.webview.onDidReceiveMessage((e) => {
            if (e.error) {
                window.showErrorMessage(e.error);
            }
        }, null, this._disposables);
        if(!previewManager.find(this.previewUri)){
            //previewManager.add(this);
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

    public isDisposed():boolean{
        if(this._disposables.length == 0){
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
            uri: this.previewUri.toString(),
            state: this.state
        };
    }

    public updateOptions(){
        
        let options = this.getOptions();
        this.service.options = options;
    }
    public configure() {
        let options = this.getOptions();
        this.service.options = options;
        this.webview.html = this.html;
        this.refresh(options);
    }

    public reveal(): void{
        this._panel.reveal(); 
    }

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
        return <string> workspace.getConfiguration('dat-preview').get('theme');
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
    abstract refresh(options: any): void;
    abstract get options():any;
    abstract set options(options:any);

}