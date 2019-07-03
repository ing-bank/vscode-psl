import * as path from 'path';
import * as vscode from 'vscode';
import { EnvironmentConfig, workspaceQuickPick } from '../common/environment';
import * as utils from '../hostCommands/hostCommandUtils';
import { MtmConnection } from '../mtm/mtm';

let extensionPath: string;

interface WebviewResources {
  app: vscode.Uri;
  vue: vscode.Uri;
}

export function activate(context: vscode.ExtensionContext) {
  extensionPath = context.extensionPath;

  context.subscriptions.push(
      vscode.commands.registerCommand('psl.dbaView', dbaViewHandler),
  )
}

async function dbaViewHandler(context: utils.ExtensionCommandContext) {
    const environment = await getEnvironmentFromContext(context);

    if (!environment) return;

    const panel = vscode.window.createWebviewPanel(
        'dbaView', // Identifies the type of the webview. Used internally
        'DBA Viewer', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'webview_resources'))],
        } // Webview options. More on these later.
      );
    
      panel.webview.html = getWebviewContent({
        app: getResourceUri('app.js'),
        vue: getResourceUri('vue.js'),
      });

      panel.webview.onDidReceiveMessage(
        async message => {
          switch (message.what) {
            case 'tables':
              const connection = new MtmConnection();
              await connection.open(environment.host, environment.port, environment.user, environment.password);
              const result = await connection.sqlQuery('SELECT FID,ALIAS,DES from DBTBL1');
              panel.webview.postMessage(buildAnswer('TABLES',['name','alias','description'],result));

              return;
          }
        }
      );
    
    
}

function buildAnswer(what, fields, value) {
  //separate by lines
  var dataArray = [];
  var forParsing = value.split('\n');
  forParsing.forEach(line => {
   var splittedLine = line.split('\t');
   let obj: any = {};
   var counter = 0;
   fields.forEach(field => {
      obj[field]=splittedLine[counter];
      counter++;
   });
   dataArray.push(obj);
 });



  return {
    id: what,
    data: dataArray
  }
}

function getResourceUri(resourceName: string) {
  const onDiskPath = vscode.Uri.file(path.join(extensionPath, 'webview_resources', resourceName));
  return onDiskPath.with({ scheme: 'vscode-resource' });
}

async function getEnvironmentFromContext(context: utils.ExtensionCommandContext) {
	const c = utils.getFullContext(context);
	let environments: EnvironmentConfig[];
	try {
		let fsPath: string;
		if (c.mode === utils.ContextMode.EMPTY) {
			const quickPick = await workspaceQuickPick();
			if (!quickPick) return;
			fsPath = quickPick.fsPath;
		}
		else fsPath = c.fsPath;
		environments = await utils.getEnvironment(fsPath);
	}
	catch (e) {
		utils.logger.error(`${utils.icons.ERROR} Invalid environment configuration ${e.message}`);
		return;
	}
	if (environments.length === 0) {
		utils.logger.error(`${utils.icons.ERROR} No environments selected.`);
		return;
	}
	return utils.getCommandEnvConfigQuickPick(environments);
}

function getWebviewContent(resources: WebviewResources) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DBA Viewer</title>
        <style>
          html, body, #app { color: #000; height: 100%; padding: 0; margin: 0; }
          div.container { width: 50%; height: 50%; float: left; }
          #table-list { background: #DDD; }
          #column-list { background: #AAA; }
          #table-details { background: #777; }
          #column-details { background: #444; }
          table {
            border: 2px solid #42b983;
            border-radius: 3px;
            background-color: #fff;
          }
          
          th {
            background-color: #42b983;
            color: rgba(255,255,255,0.66);
            cursor: pointer;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          
          tr.active {
            background-color: lightgray;
          }

          th, td {
            min-width: 120px;
            padding: 10px 20px;
          }
          
          th.active {
            color: #fff;
          }
          
          th.active .arrow {
            opacity: 1;
          }
          
          .arrow {
            display: inline-block;
            vertical-align: middle;
            width: 0;
            height: 0;
            margin-left: 5px;
            opacity: 0.66;
          }
          
          .arrow.asc {
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 4px solid #fff;
          }
          
          .arrow.dsc {
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 4px solid #fff;
          }
      </style>
      
    </head>
    <body>
  
    <div id="app">
      <div class="container" id="table-list">
        <form id="search">
          Search <input name="query" v-model="searchQuery">
        </form>
        <tables-grid
          :tables="tables"
          :columns="gridColumns"
          :filter-key="searchQuery">
        </tables-grid>
      </div>
      <div class="container" id="column-list">
        COLUMN LIST
      </div>
      <div class="container" id="table-details">
        TABLE DETAILS
      </div>
      <div class="container" id="column-details">
        COLUMN DETAILS
      </div>
    </div>
    </body>
    <script src="${ resources.vue.toString() }"></script>
    <script type="text/x-template" id="tables-tpl">
    <table>
      <thead>
        <tr>
          <th v-for="key in columns"
            @click="sortBy(key)"
            :class="{ active: sortKey == key }">
            {{ key | capitalize }}
            <span class="arrow" :class="sortOrders[key] > 0 ? 'asc' : 'dsc'">
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in filteredTables" :id=entry.name v-on:click="selectRow(entry)">
          <td v-for="key in columns">
            {{entry[key]}}
          </td>
        </tr>
      </tbody>
    </table>
  </script>
    <script src="${resources.app.toString()}"></script>
    </html>`;
  }
