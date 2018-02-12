# vscode-psl

[![Build Status](https://travis-ci.org/ing-bank/vscode-psl.svg?branch=master)](https://travis-ci.org/ing-bank/vscode-psl)

Profile Scripting Language functionality for Visual Studio Code.

## Dependencies

* Visual Studio Code version 1.17 (October 2017) or higher 

## Configuration

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
Here you can store a global array of configurations. Use auto-complete and hover suggestions for hints about using the configuration file.

## Features

The extension is able to communicate with Host via MRPC121. It can Get/Refresh from Host, Test Compile, Send to Host, Compile and Link, and Run PSL. 

These commands can be executed via:
*  The Command Pallette (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>)
*  Icons at the top-right corner of the document
*  Right-clicking the document
*  Right-clicking the file in the Side Bar Explorer

Please note that the Host Commands are executed *asynchronously*, meaning that vscode will not require you to wait to finish one action before you start another. This may have unintended consequences if you do not wait. For example, you must wait for sending to finish before you compile and link.

## Development

If you would like to join the development of this extension, you will need to install [node.js](https://nodejs.org/en/) (with NPM) in order to install the dependencies.

Once you clone the project, from the command line in the root of this project, run `npm install`.

For ideas on features to implement, visit the below link:

https://code.visualstudio.com/docs/extensions/language-support
