'use strict';
import { workspace, window, ExtensionContext, Uri, ViewColumn, TextEdit, WorkspaceEdit,WebviewPanelOnDidChangeViewStateEvent } from 'vscode';
import BasePreview from './basePreview';
import * as utils from './utilityFunctions';
import { getDefaultSettings } from 'http2';
import { previewManager } from './previewManager';
var Base64 = require('js-base64').Base64;

export default class DatPreview extends BasePreview {
    private _pendingEdits = 0;
    private _langId = null;
    private readonly _configuration: string = 'dat-preview';
    private _options = DatPreview.getDefaultOptions();
    
    constructor(context: ExtensionContext, uri: Uri, viewColumn: ViewColumn, headerColumns?: string[]) {
        super(context, uri, 'dat-preview', viewColumn);
        this.handleEvents();
        this.doUpdate(headerColumns);
        let resource = uri.with({
            scheme: 'dat-preview'
        });
        if(previewManager.find(resource)){
            this.options = previewManager.find(resource).getOptions();
            
        }else{
            previewManager.add(this);
        }
    }
    
    private handleEvents() {
        let self = this;
        this.webview.onDidReceiveMessage((e) => {
            if(e.event === "rowEditEnded") {
                let document = workspace.textDocuments.find(
                    document => {
                        return document.uri.toString() === self.uri.toString();
                    }
                );
                if (document) {
                    let line = document.lineAt(e.row + 1);
                    let values = Object.keys(e.data).map(k => {
                        return e.data[k];
                    });
                    let edit = new WorkspaceEdit();
                    let edits = [
                        TextEdit.replace(line.range, values.join(this.separator))
                    ];
                    edit.set(document.uri, edits);
                    self._pendingEdits++;
                    workspace.applyEdit(edit).then(
                        value => {
                            self._pendingEdits--;
                        }
                    );
                }
            }
        }, null, this._disposables);
    }

    private async doUpdate(header?: string[]): Promise<void> {
        try {
            const document = await workspace.openTextDocument(this.uri);
            this._langId = document ? document.languageId.toLowerCase() : null;
            let text = document.getText();

            if (header) {
                let textSeparator = utils.getLineSeparator(text);
                text = header.join(this.separator) + textSeparator + text;
            }
            let base64 = Base64.encode(text);
            let options = this.getOptions();
            this.update(base64, options);
        } catch (error) {
            window.showInformationMessage(error.message);
        }
    }

    public getOptions(): any {
        let options = this.options;
        options.uri = this.previewUri.toString();
        options.state = this.state;
        return options;
    }

    get options (): any{
        return this._options;
    }
    set options (options: any){
        this._options = options
    }
    get configuration(): string {
        return this._configuration;
    }

    get separator(): string {
        return <string> workspace.getConfiguration(this.configuration).get('separator');
    }

    public refresh(options: any): void {
        if (this._pendingEdits > 0){
            return;
        }
        let self = this;
        workspace.openTextDocument(this.uri).then(
            document => {
                let text = document.getText();
                let base64 = Base64.encode(text);
                this.update(base64, options);
                self.webview.postMessage({
                    refresh: true
                });
            });
    }
    
    get html(): string {        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <link href="${this.serviceUrl}/styles/wijmo.min.css" rel="stylesheet" type="text/css" />
            <link href="${this.serviceUrl}/styles/themes/wijmo.theme.${this.theme}.min.css" rel="stylesheet" type="text/css" />
            <link href="${this.serviceUrl}/styles/settingsForm.css" rel="stylesheet" type="text/css" />
        </head>
        <script src="${this.serviceUrl}/controls/wijmo.min.js" type="text/javascript"></script>
        <script type="text/javascript" src="${this.serviceUrl}/jquery-3.4.1.min.js"></script>
        <script src="${this.serviceUrl}/controls/wijmo.input.min.js" type="text/javascript"></script>
        <script src="${this.serviceUrl}/controls/wijmo.grid.min.js" type="text/javascript"></script>
        <script src="${this.serviceUrl}/controls/wijmo.grid.filter.min.js" type="text/javascript"></script>
        <script src="${this.serviceUrl}/js-base64.js"></script>
        <script src="${this.serviceUrl}/common.js"></script>
        <script src="${this.serviceUrl}/dat.js"></script>
        <script src="${this.serviceUrl}/settings.js"></script>
        <body style="padding:0px; overflow:hidden" onload="resizeGrid()" onresize="resizeGrid()">
        <div id="flex"><div id="modal">
                <div style="margin:5px;">
                    <img border="0" alt="settings" src="${this.serviceUrl}/img/settings.svg" onclick=loadOptions("${this.serviceUrl}","${this.previewUri}") width=20px height=20px style="cursor:pointer;">
                    <img border="0" alt="save" src="${this.serviceUrl}/img/save.svg" onclick=saveDocument("${this.serviceUrl}","${this.previewUri}") width=20px height=20px style="cursor:pointer;margin-left:5px;">
                </div>
                <div id="settingsFormModal" style="display:none" class="modal">
                    <div class="modal-content">
                        <span class="close" onclick="closeModal()">&times;</span>
                        <form class = "formSettings">
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="separator">Separator:</label>
                                </div>
                                <div class="flexCol">
                                    <input type="separator" id="separator">
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="quoteMark">Quote mark:</label>
                                </div>
                                <div class="flexCol">
                                    <input type="quoteMark" id="quoteMark">
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="hasHeaders">It has headers ?</label>
                                </div>
                                <div class="flexCol">
                                    <select id="hasHeaders">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                    </select>
                                </div>
                            </div>	
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="capitalizeHeaders">Capitalize headers ?</label>
                                </div>
                                <div class="flexCol">
                                    <select id="capitalizeHeaders">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                    </select>
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="resizeColumns">Resize columns</label>
                                </div>
                                <div class="flexCol">
                                    <select id="resizeColumns">
                                    <option value="all">all</option>
                                    <option value="none">none</option>
                                    <option value="first">first</option>
                                    </select>
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="lineNumbers">Line numbers</label>
                                </div>
                                <div class="flexCol">
                                    <select id="lineNumbers">
                                    <option value="ordinal">ordinal</option>
                                    <option value="source">source</option>
                                    <option value="none">none</option>
                                    </select>
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="commentCharacter">Comment character:</label>
                                </div>
                                <div class="flexCol">
                                    <input type="commentCharacter" id="commentCharacter">
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="skipComments">Skip comments ?</label>
                                </div>
                                <div class="flexCol">
                                    <select id="skipComments">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                    </select>
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="formatValues">Format values</label>
                                </div>
                                <div class="flexCol">
                                    <select id="formatValues">
                                    <option value="always">always</option>
                                    <option value="source">none</option>
                                    <option value="unquoted">unquoted</option>
                                    </select>
                                </div>
                            </div>
                            <br>
                            <div class="flexRow">
                                <div class="flexCol">
                                    <label for="numberFormat">Number format</label>
                                </div>
                                <div class="flexCol">
                                    <input type="numberFormat" id="numberFormat">
                                </div>
                            </div>
                        </form>	
                        <button class="btnSave" type="button" id="buttonPress" onclick="saveOptions('${this.serviceUrl}','${this.previewUri}')" >Apply settings</button>
                    </div>
                </div>
			</div>	
            </div>
        </body>
        <script type="text/javascript">
            
            const key = "GrapeCity-Internal-Use-Only,wijmo-designer-beta.azurewebsites.net,141832842148448#B0HbhZmOiI7ckJye0ICbuFkI1pjIEJCLi4TP7JGUpp4KqBnb7gGNndFNkhjd6UmUvkjaJBnWBNXOWJ6S9UXZhFlaxJDVUF4ZpRjeiNERXFVUMNlaRFVQItiNUJzdop4dKFTdCNVMaJzd4pXNCRVY8QkQx3Sev26dwE4amNVcvIjSiVle6RDZPRFSsZTNwgFWu9GU6UUM8R5djpEWnVUeJ3yaUplTy9EUQpXcwVDbJd7bIR4N9Q7bm9mY0ZGOa36cLZVaPJFVhhDRUlEUMtkQQdFO7MWOHhHWNFERqdWOVR4KzF7aRRmcjNmWD5kN5EGT6RTbkVUbvU5L4czcE9mN8dmYsRzKRZVatlnR5o6TOVXO8ZWOklERaVDNkRVaIBDcvp4V5g6av2WMRRTMzkWRycVQwUWaWZ6c9gkN9sSauJkc4syModlY4FXOY56a9E5Tt3UML3CMFFlVhBVSsBnb4Mla4Z4ZIZ5LuZUW4E7NBJUWiojITJCLiIkQCFzNBhTMiojIIJCL8QzMzgDMxQTO0IicfJye35XX3JSSwIjUiojIDJCLi86bpNnblRHeFBCI4VWZoNFelxmRg2Wbql6ViojIOJyes4nI5kkTRJiOiMkIsIibvl6cuVGd8VEIgIXZ7VWaWRncvBXZSBybtpWaXJiOi8kI1xSfis4N8gkI0IyQiwiIu3Waz9WZ4hXRgAydvJVa4xWdNBybtpWaXJiOi8kI1xSfiQjR6QkI0IyQiwiIu3Waz9WZ4hXRgACUBx4TgAybtpWaXJiOi8kI1xSfiMzQwIkI0IyQiwiIlJ7bDBybtpWaXJiOi8kI1xSfiUFO7EkI0IyQiwiIu3Waz9WZ4hXRgACdyFGaDxWYpNmbh9WaGBybtpWaXJiOi8kI1tlOiQmcQJCLiITN8ITNwASMwMDM8EDMyIiOiQncDJCLiQXZu9yclRXazJWZ7Vmc5pXYuEGdlJWLyVmbnl6clRWLv5mapdnI0IyctRkIsIyajFmY5pEIuh6bKJiOiEmTDJCLigDN4gDNxIDN8IzM8EDNxIiOiQWSiwSfiEjd8EDMyIiOiIXZ6JLLcN";
            wijmo.setLicenseKey(key);
            loadFile("${this.serviceUrl}", renderFile);
        </script>
        </html>`;
    }

    get quoteMark(): string {
        return <string> workspace.getConfiguration(this.configuration).get('quoteMark');
    }

    get hasHeaders(): boolean {
        return <boolean> workspace.getConfiguration(this.configuration).get('hasHeaders');
    }

    get capitalizeHeaders(): boolean {
        return <boolean> workspace.getConfiguration(this.configuration).get('capitalizeHeaders');
    }

    get resizeColumns(): string {
        return <string> workspace.getConfiguration(this.configuration).get("resizeColumns");
    }

    get lineNumbers(): string {
        return <string> workspace.getConfiguration(this.configuration).get('lineNumbers');
    }

    get commentCharacter(): string {
        return <string> workspace.getConfiguration(this.configuration).get('commentCharacter');
    }

    get skipComments(): boolean {
        return <boolean> workspace.getConfiguration(this.configuration).get('skipComments');
    }

    get formatValues(): string {
        return <string> workspace.getConfiguration(this.configuration).get('formatValues');
    }

    get numberFormat(): string {
        return <string> workspace.getConfiguration(this.configuration).get('numberFormat');
    }

    public static getDefaultOptions(): any{
        return {
        separator: workspace.getConfiguration('dat-preview').get('separator'),
        quoteMark: workspace.getConfiguration('dat-preview').get('quoteMark'),
        hasHeaders: workspace.getConfiguration('dat-preview').get('hasHeaders'),
        capitalizeHeaders: workspace.getConfiguration('dat-preview').get('capitalizeHeaders'),
        resizeColumns: workspace.getConfiguration('dat-preview').get('resizeColumns'),
        lineNumbers: workspace.getConfiguration('dat-preview').get('lineNumbers'),
        commentCharacter: workspace.getConfiguration('dat-preview').get('commentCharacter'),
        skipComments: workspace.getConfiguration('dat-preview').get('skipComments'),
        formatValues: workspace.getConfiguration('dat-preview').get('formatValues'),
        numberFormat: workspace.getConfiguration('dat-preview').get('numberFormat')
        }
    }
}