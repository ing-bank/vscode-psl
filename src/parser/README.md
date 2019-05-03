# psl-parser

TypeScript implementation of a PSL parser, from scratch.

## Usage

```javascript
import { parseText } from 'psl-parser';

const parsedPsl = parseText(/* PSL source text */);

parsedPsl.methods.forEach(method => {
	console.log(method.id.value);
})
```
