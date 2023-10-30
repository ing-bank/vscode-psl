# vscode-psl


[![Build and Test CI](https://github.com/jarosm3/vscode-psl/actions/workflows/build_test_vscode.yml/badge.svg)](https://github.com/jarosm3/vscode-psl/actions/workflows/build_test_vscode.yml)

Profile Scripting Language functionality for Visual Studio Code.

## Dependencies

* Visual Studio Code version 1.72.2 or higher.

## Environment Configuration

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
            "serverType": "SCA$IBS",
            "encoding": "utf8"
        }
    ]
}
```

> Added in v1.8.0 are the fields `serverType` and `encoding`. Their default values are "SCA$IBS" and "utf8", respectively.

Here you can store a global array of configurations. Any project can read from this configuration. Use auto-complete and hover suggestions for hints about using the configuration file.

Once the global configuration is saved, environments can be activated by using the `Configure Environments` button at the bottom. Multiple environments can be selected, allowing for simultaneous interactions with hosts.

## Host Communication

Commands to communicate with the Host via MRPC121 can be executed via the Command Pallette (<kbd>F1</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>), icons at the top-right corner of the document, right-clicking the document, or right-clicking the file in the Explorer sidebar.

* `Compile and Link`: Compiles and links PSL or tables
* `Get Element from Host`: Gets a new element
* `Refresh from Host`: Refreshes an existing element
* `Run PSL`: Runs a PSL element "as is" and displays the output
* `Send to Host`: Sends an existing element
* `Table Get from Host`: Gets all elements related to a table
* `Table Refresh from Host`: Fetches all elements related to an existing table element
* `Table Send to Host`: Sends all existing elements related to the table
* `Test Compile`: Test compiles PSL

> Please note that the Host Communication is done *asynchronously*, meaning that vscode will not require you to wait to finish one action before you start another. This may have unintended consequences if you do not wait. For example, you must wait for sending to finish before you compile and link.

### Getting New Elements

Two commands `Get Element from Host` and `Table Get from Host` will allow you to get new elements from the Host. When activating the commands from the editor, the element(s) will try to be placed according to this table: 

|Type | Directory |
|---|---|
BATCH | `dataqwik/batch/` |
DAT | `data/` |
FKY | `dataqwik/foreign_key/` |
IDX | `dataqwik/index/` |
JFD | `dataqwik/journal/` |
m | `routine/` |
PROC | `dataqwik/procedure/` |
properties | `property/` |
QRY | `dataqwik/query/` |
RPT | `dataqwik/report/` |
SCR | `dataqwik/screen/` |
table files (TBL and COL) | `dataqwik/table/{table_name}/` |
TRIG | `dataqwik/trigger/` |

If an element is not in the table, a prompt will ask where it should be saved.

In the case of `Table Get from Host`, the TBL and COL files will all be retrieved and placed in the `dataqwik/table/{table_name}/` directory. To get an individual TBL or COL file, use the regular `Get Element from Host` command.

These two commands behave differently when they are used in the Explorer sidebar, specifically on a directory. In this case, both "Get" commands will place the new element(s) inside the targeted directory.

### Acting on Tables

When editing a TBL or COL, the commands `Table Refresh from Host` and `Table Send to Host` are present.

The "Send" command will act on all existing elements of that table in the project at once, while the "Refresh" command will fetch all elements related to the table from the Host, even elements not present in the project. 

`Compile and Link` is also available, allowing you to "Rebuild Data Item Control Files".

### Acting on Directories

The five commands `Compile and Link`, `Refresh from Host`, `Run PSL`, `Send to Host`, and `Test Compile` can all be executed on directories from the Explorer sidebar. In this case a dialogue box will open, allowing you to act on multiple elements within the directory at once.

## Language Features

Basic language features also exist for files written in PSL, data configuration, and table files.

These features include:

* Syntax coloring
* Property and Label outline for PSL files (access by <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> or by enabling the built-in outline).
* Code Completion, Hovers, and Go-To Definitions.
* Highlighting and Hover information for editing data configuration files
* Code snippets for loops, comments, and table/column definitions, etc.

## psl-lint

This extension includes support for checking PSL against common coding standards. The setting `psl.lint` is by default set to `config`, meaning the linting module will activate upon finding a `psl-lint.json` configuration file. Here is a sample:

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

Within `include` and `exclude` are mappings from filename patterns to Rules. These are glob-style patterns ("Z*" will match all files that start with Z). The Rules are written in an array, and must be explicitly stated. The only exception is "*", which matches all Rules.

[For more information about which Rules are available, and how the linting can be used as a tool outside of vscode, visit the package at npm](https://www.npmjs.com/package/psl-lint).

## Debugging GT.M

The extension can be configured to help you debug in the Integrated Terminal with the following actions:

* Step In (<kbd>Ctrl</kbd>+<kbd>Q</kbd>): `ZSTEP INTO:"W $ZPOS ZP @$ZPOS B"`
* Step Over (<kbd>Ctrl</kbd>+<kbd>W</kbd>): `ZSTEP OVER:"W $ZPOS ZP @$ZPOS B"`
* Step Out (<kbd>Ctrl</kbd>+<kbd>E</kbd>): `ZSTEP OUTOF:"W $ZPOS ZP @$ZPOS B"`

By toggling the status bar item "GT.M Debug", the extension can send the text to your active Integrated Terminal. The default values are presented above, but can be customized to your liking.

The setting `psl.gtmDebugEnabled` can be set to `true` to keep "GT.M Debug" on by default.

You may even define custom sequences using the `psl.sendToHostTerminal` command. `key` and `args` are completely configurable. You can add as many of these configurations as you would like to your `keybindings.json`:

```
{
    "key": "ctrl+1",
    "args": "d ^DRV\n1\nxxx",
    "command": "psl.sendToHostTerminal",
    "when": "terminalFocus && psl.gtmDebug"
}
```

The `psl.gtmDebug` context value guarantees the shortcuts are only enabled when "GT.M Debug" is toggled on. This can be omitted for "always on" shortcuts.

## Available Settings

* `psl.lint`: Whether to lint files written in PSL. The default value is `config`, which means linting only activates when the `psl-lint.json` config file is present. [Read more here](#psl-lint).
* `psl.previewFeatures`: Set true to enable the latest developing features. Default value is false.
* `psl.gtmDebug`: Set true to keep GT.M Debug on by default.
* `psl.trailingNewline`: Adds a trailing newline after a "Get" or "Refresh". The default behavior is to not change the output.

## Development

If you would like to join the development of this extension, you will need to install [node.js](https://nodejs.org/en/) (with npm) in order to install the dependencies.

Once you clone the project, from the command line in the root of this project, run `npm install`.

For ideas on features to implement, visit the below link:

https://code.visualstudio.com/docs/extensions/language-support
