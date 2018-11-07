# Change Log
All notable changes to the "vscode-psl" extension will be documented in this file.

# v1.5.1

* Fixed a bug in codeQuality that caused major workbench performance degredation.

# v1.5.0

* TwoEmptyLines psl-lint rule (thanks @RajkumarVelusamy)
* MultiLineDeclare psl-lint rule (thanks @Thirurakshan)
* Automated deployments (thanks @morganing)
* Improved error messages when attempting to test compile an invalid file (thanks @cjprieb)
* Updated snippets (thanks @cjprieb)
* Improved PSL statement parsing

# v1.4.1

* Fixed a bug that would break do statement completion
* Fixed syntax highlighting to no longer highlight fields with keyword identifiers
* Made the OPEN section header syntax highlighting less strict to allow multiple spaces after the OPEN identifier.

# v1.4.0

Added new rule `RuntimeStart` that checks if variables declared outside of a TP Fence are referenced from within.

# v1.2.0

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

# v1.1.1

Introduced toggle to enable preview features (`"psl.previewFeatures" : true`). Restart after configuring to enable.

Preview features include:
- Hover and go-to definitions.
- Actions for missing separator and documentation on methods.

# v1.1.0
Implementation of the psl-lint code quality checker. Enable it by adding the setting `"psl.lint" : true` to your settings.json.

# v1.0.1
Fix a small bug where the Configure Environments button does not update properly.

# v1.0.0
Promote to 1.0.0 stable. Introduces language support.

- Tokenizer and parser
- Data item support
- Outlines for PSL entities
- Record completion items
- Fixes to environment configuration interface

# v0.0.1
Initial publication.

- Get/Refresh, Send, Run, Test Compile, and Compile and Link.
- Multi-environment configurations
- Terminal support
- PSL and table item syntax coloring
