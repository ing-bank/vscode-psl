const vscode = acquireVsCodeApi();
// register the grid component
Vue.component('tables-grid', {
	template: '#tables-tpl',
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
		},
		selectRow: function (row, tr) {
			console.log(tr);
			this.$root.selectRow(row);
		}
		
	}
})

var app = new Vue({
	el: '#app',
	methods: {
		init() {
			this.askTables()
			window.addEventListener('message', event => {
				const message = event.data;
				this.parseMessage(message);
			});

		},
		parseMessage(message) {
			console.log('Let`s parse the mf!',message);
			switch (message.id) {
				case 'TABLES':
					this.parseTables(message.data)
					break;
				case 'COLUMNS':
					break;
			}
		},
		askTables() {
			vscode.postMessage({
				command: 'get',
				what: 'tables'
			})
		},
		parseTables(tables) {
			this.tables = tables;
		},
		askColumns(table) {
			//Send message to get columns from table
		},
		parseColumns(columns) {
			console.log(columns);
		},
		selectRow: function (row) {
			console.log(row);
		}
	},
	mounted() {
		this.init();
	},
	data: {
		searchQuery: '',
		gridColumns: ['name', 'alias', 'description'],
		tables: [
			{ name: 'Chuck Norris', alias: Infinity, description: 'Testing...' },
			{ name: 'Bruce Lee', alias: 9000, description: 'Testing...' },
			{ name: 'Jackie Chan', alias: 7000, description: 'Testing...' },
			{ name: 'Jet Li', alias: 8000, description: 'Testing...' }
		],
		tablesFromMessage: []
	}
});
