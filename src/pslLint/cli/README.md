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
* PropertyIsDuplicate
* RuntimeStart
* TblColDocumentation
* TodoInfo
* TwoEmptyLines


## Contributing

To add a rule, create a class implementing one of the rule interfaces. Then, add an instance of your class to the `addRules` method found in the `activate.ts` module.

Rules will have a parsed document at their disposal. Auto-complete can guide you to using the parsed document effectively. Use the `todo.ts` and `parameters.ts` modules as examples.

Tests can be found in the `__tests__` directory at the root of the vscode-psl project. Use `parameters-test.ts` as an example.

## TODO

* More tests
* Build/Deploy/Integrate
