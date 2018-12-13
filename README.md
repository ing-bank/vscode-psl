# vscode-psl

[![Build Status](https://travis-ci.org/ing-bank/vscode-psl.svg?branch=master)](https://travis-ci.org/ing-bank/vscode-psl)

Profile Scripting Language functionality for Visual Studio Code.

## Dependencies

* Visual Studio Code version 1.23.0 (April 2018) or higher.

## Avaliable Settings

* `psl.lint`	Whether to lint files written in PSL. The default value is `config`, which means linting only activates when the `psl-lint.json` config file is present. [Read more here](#psl-lint).
* `psl.previewFeatures`	Set true to enable the latest developing features (requires restart). Default value is false.
* `psl.trailingNewline`	Adds a trailing newline after a "Get" or "Refresh". The default behavior is to not change the output.
* `psl.documentationServer`	HTTP POST endpoint that responds with PSL documentation in markdown format.

## Environment Configuration

Locate the button at the bottom-right corner titled `Configure Environments`. If the button is not visible, use the Command Pallete (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) to find the `PSL: Configure Environment` command. A JSON object of the following form will appear:
```json
{
	"environments": [
		{
			"name": "",
			"host": "",
			"port": 0,
			"user": "",
			"password": "",
			"sshLogin": ""
		}
	]
}
```
Here you can store a global array of configurations. Any project can read from this configuration. Use auto-complete and hover suggestions for hints about using the configuration file.

Once the global configuration is saved, environments can be activated by using the `Configure Environments` button at the bottom. Multiple environments can be selected, allowing for simultaneous interactions with hosts.

## Features

The extension is able to communicate with Host via MRPC121 to do the following:
* Get/Refresh elements and entire tables from Host
* Send elements and entire tables to Host
* Test Compile .PROC and .PSL files
* Compile and Link .PROC and .PSL files
* Run .PROC and .PSL files
* [Code Quality checks via psl-lint](#psl-lint)

These commands can be executed via the Command Pallette (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), icons at the top-right corner of the document, right-clicking the document, or right-clicking the file in the Side Bar Explorer.

> Please note that the Host Commands are executed *asynchronously*, meaning that vscode will not require you to wait to finish one action before you start another. This may have unintended consequences if you do not wait. For example, you must wait for sending to finish before you compile and link.

Basic language features also exist for files written in PSL, data configuration, and table files.

These features include:
* Syntax coloring
* Property and Label outline for PSL files (access by <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> or by enabling the built-in outline).
* Code Completion, Hoves, and Go-To Definition by activating `psl.previewFeatures`.
* Highlighting and Hover information for editing data configuration files
* Code snippets for loops, comments, and table/column definitions

### psl-lint

This extension includes support for checking PSL code against common standards. The setting `psl.lint` is by default set to `config`, meaning the linting module will activate upon finding a `psl-lint.json` configuration file. The format of the file is as follows:

```
{
	"version": 1,
	"include": {
		"Z*": ["*"],
		"*": ["TodoInfo"]
	},
	"exclude": {
		"ZRPC*.PROC": ["MemberCamelCase"]
	}
}
```

This example illustrates how the configuration file is defined. Within `include` and `exclude` are filename-to-rules mappings. The filenames can be glob patterns ("Z*" will match all files that start with Z). The rules are written in an array, and must be explicitly stated. The only exception is the "*" rule, which matches all rules. [For more information about which rules are available, and how the linting can be used outside of vscode, visit the package at npm](https://www.npmjs.com/package/psl-lint).

## Development

If you would like to join the development of this extension, you will need to install [node.js](https://nodejs.org/en/) (with NPM) in order to install the dependencies.

Once you clone the project, from the command line in the root of this project, run `npm install`.

For ideas on features to implement, visit the below link:

https://code.visualstudio.com/docs/extensions/language-support
