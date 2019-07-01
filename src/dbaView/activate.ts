import * as vscode from 'vscode';
import { EnvironmentConfig, workspaceQuickPick } from '../common/environment';
import * as utils from '../hostCommands/hostCommandUtils';
import { MtmConnection } from '../mtm/mtm';

export function activate(context: vscode.ExtensionContext) {
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
            enableScripts: true
        } // Webview options. More on these later.
      );
    
      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case 'alert':
                async _ => {
                  const connection = new MtmConnection();
                  await connection.open(environment.host, environment.port, environment.user, environment.password);
                  const result = await connection.sqlQuery('SELECT FID from DBTBL1');
                  vscode.window.showErrorMessage(result);
                  panel.webview.postMessage(result);
                }
              return;
          }
        },
        undefined,
        context.subscriptions
      );
    
    
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

function getWebviewContent() {
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
      </style>
      
    </head>
    <body>
  
    <div id="app">
      <div class="container" id="table-list">
        <form id="search">
          Search <input name="query" v-model="searchQuery">
        </form>
        <demo-grid
          :tables="tables"
          :columns="gridColumns"
          :filter-key="searchQuery">
        </demo-grid>
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
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.js"></script>
    <script type="text/x-template" id="grid-template">
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
        <tr v-for="entry in filteredTables">
          <td v-for="key in columns">
            {{entry[key]}}
          </td>
        </tr>
      </tbody>
    </table>
  </script>
    <script>
    const vscode = acquireVsCodeApi();
    // register the grid component
  Vue.component('demo-grid', {
    template: '#grid-template',
    props: {
      tables: Array,
      columns: Array,
      filterKey: String
    },
    data: function () {
      var sortOrders = {}
      this.columns.forEach(function (key) {
        sortOrders[key] = 1
      })
      return {
        sortKey: '',
        sortOrders: sortOrders
      }
    },
    computed: {
      filteredTables: function () {
        var sortKey = this.sortKey
        var filterKey = this.filterKey && this.filterKey.toLowerCase()
        var order = this.sortOrders[sortKey] || 1
        var tables = this.tables
        if (filterKey) {
          tables = tables.filter(function (row) {
            return Object.keys(row).some(function (key) {
              return String(row[key]).toLowerCase().indexOf(filterKey) > -1
            })
          })
        }
        if (sortKey) {
          tables = tables.slice().sort(function (a, b) {
            a = a[sortKey]
            b = b[sortKey]
            return (a === b ? 0 : a > b ? 1 : -1) * order
          })
        }
        return tables
      }
    },
    filters: {
      capitalize: function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1)
      }
    },
    methods: {
      sortBy: function (key) {
        this.sortKey = key
        this.sortOrders[key] = this.sortOrders[key] * -1
      }
    }
  })
    
    var app = new Vue({
      el: '#app',
      methods:{
        init() {
          this.askTables()
          window.addEventListener('message', event => {
            this.parseMessage(message)
        });
          //Send message to get the tables
          console.log('Sunt aici!')
          
        },
        parseMessage(message) {
          const message = event.data; // The JSON data our extension sent
          switch(message.id) {
            case 'tables':
              this.parseTables(message.data)
              break;
            case 'columns':
              break;
          }
        },
        askTables() {
          vscode.postMessage({
            command: 'alert',
            text: 'test'
          })
        },
        parseTables(tables) {
          document.getElementById('table-details').textContent(tables)
          console.log(tables);
        },
        askColumns(table) {
          //Send message to get columns from table
        },
        parseColumns(columns) {
          console.log(columns);
        }
      },
      mounted(){
        this.init();
      },
      data: {
        searchQuery: '',
        gridColumns: ['name', 'alias', 'description'],
        tables: [
          { name: 'Chuck Norris', alias: Infinity , description: 'Testing...'},
          { name: 'Bruce Lee', alias: 9000 , description: 'Testing...'},
          { name: 'Jackie Chan', alias: 7000 , description: 'Testing...'},
          { name: 'Jet Li', alias: 8000 , description: 'Testing...'}
        ],
        
      }
    });
      </script>
    </html>`;
  }
