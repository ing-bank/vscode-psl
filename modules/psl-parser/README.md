# PSL Parser

Submodule of the `vscode-psl` project with PSL parser related software.

## Usage

```javascript
import { parseText } from 'psl-parser';

const parsedPsl = parseText(/* PSL source text */);

parsedPsl.methods.forEach(method => {
    console.log(method.id.value);
})
```
