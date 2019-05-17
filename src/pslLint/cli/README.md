# psl-lint

A linter or lint refers to tools that analyze source code to flag programming errors, bugs, stylistic errors, and suspicious constructs.

This module works by adding rules that are automatically checked at the appropriate time.

## Current Rules

* MemberCamelCase
* MemberLength
* MemberLiteralCase
* MemberStartsWithV
* MethodDocumentation
* MethodParametersOnNewLine
* MethodSeparator
* MultiLineDeclare
* PropertyIsDummy
* RuntimeStart
* TblColDocumentation
* TodoInfo
* TwoEmptyLines

## Configuration

By creating a file `psl-lint.json` at the root of the project, you can control the behavior of the linter. The format of the file is as follows:

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

Within `include` and `exclude` are filename-to-rules mappings. The filenames can be glob patterns ("Z*" will match all files that start with Z). The rules are written in an array, and must be explicitly stated. The only exception is the "*" rule, which matches all rules.

## Contributing

To add a rule, create a class implementing one of the rule interfaces. Then, add an instance of your class to the `addRules` method found in the `activate.ts` module.

Rules will have a parsed document at their disposal. Auto-complete can guide you to using the parsed document effectively. Use the `todo.ts` and `parameters.ts` modules as examples.

Tests can be found in the `__tests__` directory at the root of the vscode-psl project. Use `parameters-test.ts` as an example.

## TODO

* More tests
* Build/Deploy/Integrate
