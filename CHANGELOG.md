# Change Log

All notable changes to the "vscode-psl" extension will be documented in this
file.

## v1.13.5

* iso88592 support

## v1.13.4

* Update the `json5` dependency to 2.2.3 and increment version numbers. Note
  that this change is similar to 1.12.2, as the 1.13 version is a split from
  1.12 for now.

## v1.13.3

* Corrected highlight for storage modifier keywords in formal parameter rule.

## v1.13.2

* Further enhancements in Language highlight.

## v1.13.1

* Fix bugs introduced in Language highlight enhancements.

## v1.13.0

* Language highlight enhancements.

## v1.12.2

* Update the `json5` dependency to 2.2.3 and increment version numbers.

## v1.12.1

* Fix of bug where `Buffer` was not decoded to a `string`.

## v1.12.0

* Update dependencies.
* Implement support for the serialized data format.
* Add snippet for `#PROPERTYDEF` directives.
* Add default value for the date in the revision history snippet.

## v1.11.4

Dependency updates

## v1.11.3

* Code actions for batches and triggers

## v1.11.2

* Scope the setting `psl.trailingNewline` to resource

## v1.11.0

Allow sources to be split across multiple projects with a `profile-project.json`. Current functionality is *unstable* and is 
subject to change (versioned `0.0.1`).

```json
{
	"version": "0.0.1",
	"parentProjects": [
		"profile-application",
		"profile-framework"
	],
	"pslSources": [
		"dataqwik/procedure/",
		"psl/"
	],
	"fileDefinitionSources": [
		"dataqwik/table/"
	]
}
```

This file can be used to configure sources, not only for the current project, but across multiple projects in a vscode workspace.
All fields are optional. In the example above, `pslSources` and `fileDefinitionSources` are populated with their default
values. The names in the `parentProjects` array refer to the names of the vscode workspace themselves. For more about
workspace visit the [official documentation](https://code.visualstudio.com/docs/editor/multi-root-workspaces) for more information.

Other changes include:

* Data Items from PARFID's can now be resolved by Completion/Hover/Go-To
* Data Item Completion now uses lowercase

## v1.10.1
* Allow messages with length > 16^2 - 2 to be read from MTM

## v1.10.0
* Take language features out of preview
* Enable GT.M debugging in the status bar
* Added default snippet for pslmain() (thanks [@mischareitsma](https://github.com/mischareitsma))
* Code coverage visualization
* Update documentation

## v1.9.0

Adds two new custom menu items "Run Test" and "Run Test (with Coverage)". The custom logic must be implemented in your Profile instance. Then it can be called by adding this configuration to your `settings.json`:
```json
"psl.customTasks": [
	{
		"command": "runCoverage",
		"mrpcID": "^ZMRPC121",
		"request": "PSLRUNTESTC"
	},
	{
		"command": "runTest",
		"mrpcID": "^ZMRPC121",
		"request": "PSLRUNTEST"
	}
]
```

The `command` names are fixed, but the `mrpcID` and `request` fields can match your implementation.

Other changes include:
* Adds rule for "PropertyIsDuplicate" from psl-lint (thanks [@Thirurakshan](https://github.com/Thirurakshan))
* Properly scope preview configuration to resource
* Change batch section icon
* Fix code quality to only lint when config file is present

## v1.8.1

* Do not change focus to output channel after writing

## v1.8.0

* Adds fields `serverType` and `encoding` to environments.json (thanks [@joelgomes85](https://github.com/joelgomes85) for opening the issue)

## v1.7.1

* public declarations that start with v are now only diagnosed at INFO level

## v1.7.0

* Adds rule for "TblColDocumentation" from psl-lint (thanks [@ManikandanKKA](https://github.com/ManikandanKKA))
* Add a setting to check trailing newline after a "Get" or "Refresh".
* Adds a command to render markdown documentation of a PSL document when a server is present.

## v1.6.0

* Adds rule "PropertyIsDummy" from psl-lint (thanks [@kewtree1408](https://github.com/kewtree1408))

## v1.5.1

* Fixed a bug in codeQuality that caused major workbench performance degredation.

## v1.5.0

* TwoEmptyLines psl-lint rule (thanks [@RajkumarVelusamy](https://github.com/RajkumarVelusamy))
* MultiLineDeclare psl-lint rule (thanks [@Thirurakshan](https://github.com/Thirurakshan))
* Automated deployments (thanks [@morganing](https://github.com/morganing))
* Improved error messages when attempting to test compile an invalid file (thanks [@cjprieb](https://github.com/cjprieb))
* Updated snippets (thanks [@cjprieb](https://github.com/cjprieb))
* Improved PSL statement parsing

## v1.4.1

* Fixed a bug that would break do statement completion
* Fixed syntax highlighting to no longer highlight fields with keyword identifiers (thanks [@cjprieb](https://github.com/cjprieb))
* Made the OPEN section header syntax highlighting less strict to allow multiple spaces after the OPEN  identifier (thanks [@cjprieb](https://github.com/cjprieb))

## v1.4.0

Added new rule `RuntimeStart` that checks if variables declared outside of a TP Fence are referenced from within.

## v1.2.0

Linting in PSL now uses a configuration file. By default the setting `"psl.lint"` is now `"config"`. Other options are `"all"` or `"none"`.

A file must be included in order to be checked. If it is then excluded, it will not be checked. Here is an example layout:

```json
{
	"version": 1,
	"include": {
		"Z*": ["*"],
		"*.psl": ["*"],
		"*": ["TodoInfo"]
	},
	"exclude": {}
}
```

This will lint files starting with a Z and all .psl files. All rules will be applied to these files. All files will have the TodoInfo rule applied to them.

These are the current rules:
- TodoInfo
- MemberCamelCase
- MemberLength
- MemberStartsWithV
- MethodDocumentation
- MethodSeparator
- MethodParametersOnNewLine
- PropertyLiteralCase

Additionally, this version also introduces Completion Items with Suggestions as another preview feature for the PSL language.

## v1.1.1

Introduced toggle to enable preview features (`"psl.previewFeatures" : true`). Restart after configuring to enable.

Preview features include:
- Hover and go-to definitions.
- Actions for missing separator and documentation on methods.

## v1.1.0
Implementation of the psl-lint code quality checker. Enable it by adding the setting `"psl.lint" : true` to your settings.json.

## v1.0.1
Fix a small bug where the Configure Environments button does not update properly.

## v1.0.0
Promote to 1.0.0 stable. Introduces language support.

- Tokenizer and parser
- Data item support
- Outlines for PSL entities
- Record completion items
- Fixes to environment configuration interface

## v0.0.1
Initial publication.

- Get/Refresh, Send, Run, Test Compile, and Compile and Link.
- Multi-environment configurations
- Terminal support
- PSL and table item syntax coloring
