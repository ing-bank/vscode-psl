import * as vscode from 'vscode';
import { MtmConnection } from '../mtm/mtm';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
      vscode.commands.registerCommand('psl.dbaView', dbaViewHandler),
  )
}

function dbaViewHandler() {
    const panel = vscode.window.createWebviewPanel(
        'dbaView', // Identifies the type of the webview. Used internally
        'DBA Viewer', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true
        } // Webview options. More on these later.
      );
    
      panel.webview.html = getWebviewContent();

      setTimeout(async _ => {
        const connection = new MtmConnection();
        await connection.open('localhost',2009,'COERUI','xxx');
        const result = await connection.sqlQuery('SELECT FID from DBTBL1');
        panel.webview.postMessage(result);
      }, 10000);
    
    
}

function getTables() {
    return {
        'id':'tables',
        'data': [
            {
                'id': 1,
                'name': 'TableName 1',
                'description': 'TableName 1 Description'
            },
            {
                'id': 2,
                'name': 'TableName 2',
                'description': 'TableName 2 Description'
            }
        ]
    }
}

function getWebviewContent() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DBA Viewer</title>
      <style>
        html, body { height: 100%; padding: 0; margin: 0; }
        div { width: 50%; height: 50%; float: left; }
        #table-list { background: #DDD; }
        #column-list { background: #AAA; }
        #table-details { background: #777; }
        #column-details { background: #444; }
    </style>
    
  </head>
  <body>
    <div id="table-list">
    </div>
    <div id="column-list">
    </div>
    <div id="table-details">
    </div>
    <div id="column-details">
    </div>
  </body>
  <script>
    window.addEventListener('message', event => {

        const message = event.data; // The JSON data our extension sent
        console.log(message);
        document.getElementById('table-list').textContent(message)
        // switch (message.id) {
        //     case 'tables':
        //         alert(message.data)
        //         break;
        // }
    });
    </script>
  </html>`;
  }