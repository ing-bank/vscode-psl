# Submodules in the `vscode-psl` Project

The `vscode-psl` project was initially meant for a visual studio code extension
for PSL. However, some of the code that deals with the PSL language could be
reused in other projects as well. An example is the parsing and linting
capabilities that came with their own CLI to run them automated in some
continuous integration solution.

In order to still keep all the source code in one repository, but make use
of reusable modules, the project was restructured to make use of [workspaces].
The various submodules were chosen to decouple code that deals with some
aspect of PSL or Profile in general from any visual studio code extension or
IO related code. The visual studio code extension software is available in the
root of the project under the `src` directory. Modules that can benefit from IO
related capabilities come with a separate CLI module (e.g. `psl-lint-cli`).

## Introducing a new Submodule

To introduce a new submodule, make a directory in the [`modules/`](../modules/)
directory. Add the following files:

- `package.json`
- `tsconfig.json`
- `jest.config.ts`
- `src/index.ts`

The following template `package.json` can be used:

```json
{
    "name": "<submodule name>",
    "version": "0.0.1-dev",
    "description": "<submodule description>",
    "main": "./out/index.js",
    "repository": {
        "type": "git",
        "url": "https://github.com/ing-bank/vscode-psl"
    },
    "scripts": {
        "compile": "tsc -p ./",
        "clean": "rm -rf out/ tsconfig.tsbuildinfo",
        "test": "jest"
    },
    "license": "MIT",
    "devDependencies": {
        "@types/jest": "^28.1.3",
        "jest": "^28.1.1",
        "ts-jest": "^28.0.5",
        "ts-node": "^10.8.1",
        "typescript": "^4.7.3"
    }
}
```

The following template of a `tsconfig.json` file can be used:

```json
{
    "extends": "../../tsconfig.common.json",
    "compilerOptions": {
        "outDir": "out",
        "rootDir": "src",
    },
    "exclude": [
        "node_modules",
        "out",
        "__test__",
        "jest.config.ts"
    ]
}
```

The following template of the `jest.config.ts` file can be used:

```typescript
import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node"
}

export default config
```

[workspaces]: https://docs.npmjs.com/cli/v7/using-npm/workspaces
