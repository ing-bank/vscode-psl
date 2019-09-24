import * as fs from 'fs-extra';
import * as path from 'path';

type ConfigBaseDir = string;

const activeConfigs: Map<ConfigBaseDir, ProjectConfig> = new Map();

interface ProjectConfig {
	parentProjects: [];
	pslSources: [];
	fileDefinitionSources: [];
}

export async function setConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = path.dirname(configPath);
	const config: ProjectConfig = await fs.readFile(configPath).then(b => JSON.parse(b.toString()));
	activeConfigs.set(configBaseDir, config);
}

export interface FinderPaths {
	activeRoutine: string;
	projectPsl: string[];
	corePsl: string;
	table: string;
}

export function getFinderPaths(base: string, activeRoutine?: string): FinderPaths {
	const relativeCorePath = '.vscode/pslcls/';
	const relativeProjectPath = ['dataqwik/procedure/', 'test/psl/utgood/', 'test/psl/stgood/'];
	const relativeTablePath = 'dataqwik/table/';
	return {
		activeRoutine,
		corePsl: path.join(base, relativeCorePath),
		projectPsl: relativeProjectPath.concat(relativeCorePath).map(pslPath => path.join(base, pslPath)),
		table: path.join(base, relativeTablePath),
	};
}
