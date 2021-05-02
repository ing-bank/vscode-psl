# GT.M Debugger

A work in progress project.

Debugs by spawning a direct mode process and communicates through standard IO.

If you use Docker your `launch.json` might look like this:

```json
{
	"configurations": [
		{
			"type": "gtm",
			"request": "launch",
			"name": "GT.M Docker",
			"command": "docker",
			"args": [
				"exec",
				"-i",
				"profiledevelop",
				"ksh",
				"-c",
				"'/v7dev/dm'"
			]
		}
	]
}
```
