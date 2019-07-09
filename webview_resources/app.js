const vscode = acquireVsCodeApi();
// register the grid component
Vue.component('tables-grid', {
	template: '#tables-tpl',
	props: {
		tables: Array,
		columns: Array,
		filterKey: String,
		selectedTable: String
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
			//Remove any selected rows
			$(".selected").each(function() {
				$( this ).removeClass('selected');
				$( this ).css("background-color", "transparent");
			})
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
		selectTable: function (tableName) {
			this.$root.selectTable(tableName);
		}
		
	}
})

Vue.component('columns-grid', {
	template: '#columns-tpl',
	props: {
		tables: Array,
		columns: Array,
		filterKey: String,
		selectedColumn: String
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
		filteredColumns: function () {
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
			//Remove any selected rows
			$(".selectedCol").each(function() {
				$( this ).removeClass('selected');
				$( this ).css("background-color", "transparent");
			})
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
		selectColumn: function (tableName) {
			this.$root.selectColumn(tableName);
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
			switch (message.id) {
				case 'TABLES':
					this.parseTables(message.data)
					break;
				case 'COLUMNS':
					this.parseColumns(message.data)
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
			vscode.postMessage({
				command: 'get',
				what: 'columns',
				table: table
			})
		},
		parseColumns(columns) {
			this.columns=columns;
		},
		selectTable: function (tableName) {
			this.selectedTable=tableName;
			$(".selected").each(function() {
				$( this ).removeClass('selected');
				$( this ).css("background-color", "transparent");
			})
			$("#"+tableName).addClass('selected');
			$("#"+tableName).css("background-color", "yellow");
			$("#column_query").val("");
			this.askColumns(tableName);
		},
		selectColumn: function(columnName) {
			this.selectedColumn=columnName;
			$(".selectedCol").each(function() {
				$( this ).removeClass('selectedCol');
				$( this ).css("background-color", "transparent");
			})
			$("#"+columnName).addClass('selectedCol');
			$("#"+columnName).css("background-color", "yellow");
		}
	},
	mounted() {
		this.init();
	},
	data: {
		searchQuery: '',
		searchColQuery: '',
		gridColumns: ['name', 'alias', 'description'],
		selectedTable: '',
		selectedColumn: '',
		tables: [
		],
		columns: [
		],
		tablesFromMessage: []
	}
});