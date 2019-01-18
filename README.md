# vscode-psl

[![Build Status](https://travis-ci.org/ing-bank/vscode-psl.svg?branch=master)](https://travis-ci.org/ing-bank/vscode-psl)

Profile Scripting Language functionality for Visual Studio Code.

## Dependencies

* Visual Studio Code version 1.23.0 (April 2018) or higher 

## Configuration

Locate the button at the bottom-right corner titled `Configure Environments`. If the button is not visible, use the Command Palette (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) to find the `PSL: Configure Environment` command. A JSON object of the following form will appear:
```json
{
	"environments": [
		{
			"name": "",
			"host": "",
			"port": 0,
			"user": "",
			"password": "",
			"sshLogin": "",
			"serverType": "SCA$IBS",   // added v1.8.0
			"encoding": "utf8"         // added v1.8.0
		}
	]
}
```

> Added in v1.8.0 are the fields `serverType` and `encoding`. Their default values are "SCA$IBS" and "utf8", respectively.

Here you can store a global array of configurations. Any project can read from this configuration. Use auto-complete and hover suggestions for hints about using the configuration file.

Once the global configuration is saved, environments can be activated by using the `Configure Environments` button at the bottom. Multiple environments can be selected, allowing for simultaneous interactions with hosts.

## Features

The extension is able to communicate with Host via MRPC121 to do the following:
* Get/Refresh elements and entire tables from Host
* Send elements and entire tables to Host
* Test Compile .PROC and .PSL files
* Compile and Link .PROC and .PSL files
* Run .PROC and .PSL files

These commands can be executed via the Command Pallette (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), icons at the top-right corner of the document, right-clicking the document, or right-clicking the file in the Side Bar Explorer.

> Please note that the Host Commands are executed *asynchronously*, meaning that vscode will not require you to wait to finish one action before you start another. This may have unintended consequences if you do not wait. For example, you must wait for sending to finish before you compile and link.

Basic language features also exist for files written in PSL, data configuration, and table files. 

These features include:
* Syntax coloring
* Property and Label outline for PSL files (access by <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> or with [this extension](https://marketplace.visualstudio.com/items?itemName=patrys.vscode-code-outline))
* Auto-complete for Record objects in PSL (activated by the `.` operator or by <kbd>Ctrl</kbd>+<kbd>Space</kbd>)
* Highlighting and Hover information for editing data configuration files
* Code snippets for loops, comments, and table/column definitions

## Development

If you would like to join the development of this extension, you will need to install [node.js](https://nodejs.org/en/) (with NPM) in order to install the dependencies.

Once you clone the project, from the command line in the root of this project, run `npm install`.

For ideas on features to implement, visit the below link:

https://code.visualstudio.com/docs/extensions/language-support
