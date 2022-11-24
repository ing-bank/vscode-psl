# psl-parser

[![Build and Test CI](https://github.com/ing-bank/vscode-psl/actions/workflows/build_test_vscode.yml/badge.svg)](https://github.com/ing-bank/vscode-psl/actions/workflows/build_test_vscode.yml)

TypeScript implementation of a Profile Scripting Language Parser.

## Usage

```javascript
import { parseText } from 'psl-parser';

const parsedPsl = parseText(/* PSL source text */);

parsedPsl.methods.forEach(method => {
	console.log(method.id.value);
})
```

## Development

If you would like to join the development of this extension, you will need to install [node.js](https://nodejs.org/en/) (with npm) in order to install the dependencies.

Once you clone the project, from the command line in the root of this project, run `npm install`.
