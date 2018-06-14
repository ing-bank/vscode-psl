import * as fs from 'fs-extra';
import * as path from 'path';
import * as minimatch from 'minimatch';

type ConfigBaseDir = string;
export let activeConfigs: Map<ConfigBaseDir, Config> = new Map<ConfigBaseDir, Config>();

export interface Config {
	include: ConfigSetting;
	exclude: ConfigSetting;
}
type ConfigSetting = { [filePattern: string]: RulePattern[] };
type RulePattern = string;

export async function setConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = await path.dirname(configPath); 
	const config: Config = await fs.readFile(configPath).then(b => JSON.parse(b.toString()));
	activeConfigs.set(configBaseDir, config);
}

export async function removeConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = await path.dirname(configPath); 
	activeConfigs.delete(configBaseDir);
}

export function getConfig(fileName: string): Config | undefined {
	for (const configBaseDir of activeConfigs.keys()) {
		const relative = path.relative(configBaseDir, fileName);
		if (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
			return activeConfigs.get(configBaseDir);
		};
	}
}

export function match(fileName: string, ruleName: string, configObj: Config) {
	let matches: boolean = false;
	const findMatch = (configSetting: ConfigSetting) => {
		for (const filePattern in configSetting) {
			let rulePatterns: RulePattern[] = configSetting[filePattern];
			for (const rulePattern of rulePatterns) {
				if (minimatch(ruleName, rulePattern) && minimatch(fileName, filePattern)) {
					return true;
				}
			}
		}
		return false;
	}

	matches = findMatch(configObj.include);
	if (!matches) return false;
	return !findMatch(configObj.exclude);
}