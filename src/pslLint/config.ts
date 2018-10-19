import * as fs from 'fs-extra';
import * as minimatch from 'minimatch';
import * as path from 'path';

type ConfigBaseDir = string;
export let activeConfigs: Map<ConfigBaseDir, RegexConfig> = new Map();

export interface Config {
	include: ConfigSetting;
	exclude: ConfigSetting;
}
export interface RegexConfig {
	include: RegexConfigObj[];
	exclude: RegexConfigObj[];
}
interface ConfigSetting { [filePattern: string]: string[]; }

interface RegexConfigObj {
	pattern: RegExp;
	rules: string[];
}

export async function setConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = await path.dirname(configPath);
	const config: Config = await fs.readFile(configPath).then(b => JSON.parse(b.toString()));
	activeConfigs.set(configBaseDir, transform(config));
}

export function transform(config: Config): RegexConfig {
	const includes: RegexConfigObj[] = [];
	const excludes: RegexConfigObj[] = [];
	for (const pattern in config.include) {
		if (config.include.hasOwnProperty(pattern)) {
			const rules = config.include[pattern];
			includes.push({pattern: minimatch.makeRe(pattern), rules});
		}
	}
	for (const pattern in config.exclude) {
		if (config.exclude.hasOwnProperty(pattern)) {
			const rules = config.exclude[pattern];
			excludes.push({pattern: minimatch.makeRe(pattern), rules});
		}
	}
	return {include: includes, exclude: excludes};
}

export async function removeConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = await path.dirname(configPath);
	activeConfigs.delete(configBaseDir);
}

export function getConfig(fileName: string): RegexConfig | undefined {
	for (const configBaseDir of activeConfigs.keys()) {
		const relative = path.relative(configBaseDir, fileName);
		if (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
			return activeConfigs.get(configBaseDir);
		}
	}
}

export function matchConfig(fileName: string, ruleName: string, configObj: RegexConfig) {
	let matches: boolean = false;
	const findMatch = (configSettings: RegexConfigObj[]) => {
		for (const configSetting of configSettings) {
			if (!fileName.match(configSetting.pattern)) continue;
			for (const rulePattern of configSetting.rules) {
				if (rulePattern === '*' || rulePattern === ruleName) return true;
			}
		}
	};

	matches = findMatch(configObj.include);
	if (!matches) return false;
	return !findMatch(configObj.exclude);
}
