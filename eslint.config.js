// @ts-check
import { defineConfig } from "eslint/config";

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig({
	files: ["**/*.ts", "eslint.config.js"],
	ignores: ["**/out/**", "**/tmp/**", "**/dist/**"],
	extends: [
		eslint.configs.recommended,
		tseslint.configs.recommended,
	],
	plugins: {
		"@stylistic": stylistic
	},
	rules: {
		"@stylistic/indent": ["error", "tab"],
		"@stylistic/quotes": ["error", "double", {"avoidEscape": true}],
		"@stylistic/max-len": [
			"error",
			{
				"code": 120,
				"tabWidth": 8,
				"ignorePattern": "^\\s*// (TODO|FIXME|eslint-).*$"
			}
		],
		"@stylistic/semi": ["error", "always"]
	}
});
