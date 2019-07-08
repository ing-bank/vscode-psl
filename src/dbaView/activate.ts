import * as path from 'path';
import * as vscode from 'vscode';
import { EnvironmentConfig, workspaceQuickPick } from '../common/environment';
import * as utils from '../hostCommands/hostCommandUtils';
import { MtmConnection } from '../mtm/mtm';

let extensionPath: string;

interface WebviewResources {
  app: vscode.Uri;
  vue: vscode.Uri;
  jquery: vscode.Uri;
  bootstrap: vscode.Uri;
  style: vscode.Uri;
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
        jquery: getResourceUri('jquery.min.js'),
        bootstrap: getResourceUri('bootstrap.min.css'),
        style: getResourceUri('style.css'),
      });

      panel.webview.onDidReceiveMessage(
        
        async message => {
          console.log("Receiving a message!",message);
          switch (message.what) {
            case 'tables':
              const tablesConnection = new MtmConnection();
              await tablesConnection.open(environment.host, environment.port, environment.user, environment.password);
              const tablesResult = await tablesConnection.sqlQuery('SELECT FID,ALIAS,DES from DBTBL1');
              panel.webview.postMessage(buildAnswer('TABLES',['name','alias','description'],tablesResult));
              break;
            case 'columns':
              const queryTable = message.table;
              const columnsConnection = new MtmConnection();
              await columnsConnection.open(environment.host, environment.port, environment.user, environment.password);
              const columnsResult = await columnsConnection.sqlQuery('SELECT DI,ALIAS,DES FROM DBTBL1D WHERE FID=\''+queryTable+'\'');
              panel.webview.postMessage(buildAnswer('COLUMNS',['name','alias','description'],columnsResult));
              break;
              
          }
        }
      );
}


function buildAnswer(what, fields, value) {
  //separate by lines
  var dataArray = [];
  //TODO: Apply filter to remove literals
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
          <link rel="stylesheet" href="${ resources.bootstrap.toString() }">
          <link rel="stylesheet" href="${ resources.style.toString() }">
       </head>
       <body>
          <div id="app">
             <div class="container table-responsive" id="table-list">
                <div id="table_group" class="form-group">
                   <input id="table_query" class="form-control" placeholder="Table" name="query" v-model="searchQuery">
                </div>
                <tables-grid
                   :tables="tables"
                   :columns="gridColumns"
                   :filter-key="searchQuery">
                </tables-grid>
             </div>
             <div class="container table-responsive" id="column-list">
                <div id="column_group" class="form-group">
                      <input id="column_query" class="form-control" placeholder="Columns" name="query" v-model="searchColQuery">
                    </div>
                <columns-grid
                  :tables="columns"
                  :columns="gridColumns"
                  :filter-key="searchColQuery">
                </columns-grid>
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
          <table class="fixed_headers">
              <thead class="thead-dark">
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
              <tr v-for="entry in filteredTables" :id=entry.name v-on:click.prevent="selectTable(entry.name)">
                <td v-for="key in columns">
                  {{entry[key]}}
                </td>
              </tr>
            </tbody>
          </table>
       </script>
       <script type="text/x-template" id="columns-tpl">
          <table class="fixed_headers">
              <thead class="thead-dark">
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
              <tr v-for="entry in filteredColumns" :id=entry.name v-on:click.prevent="selectColumn(entry.name)">
                <td v-for="key in columns">
                  {{entry[key]}}
                </td>
              </tr>
            </tbody>
          </table>
       </script>
       <script src="${resources.jquery.toString()}"></script>
       <script src="${resources.app.toString()}"></script>
       
       
    </html>`;
  }
