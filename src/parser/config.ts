import * as fs from 'fs-extra';
import * as path from 'path';

type ConfigBaseDir = string;

const activeConfigs: Map<ConfigBaseDir, ProjectConfig> = new Map();

interface ProjectConfig {
	parentProjects: string[];
	pslSources: string[];
	fileDefinitionSources: string[];
}

export async function setConfig(configPath: string, workspaces: Map<string, string>) {
	const configBaseDir: ConfigBaseDir = path.dirname(configPath);
	const config: ProjectConfig = await fs.readFile(configPath).then(b => JSON.parse(b.toString()));
	config.parentProjects = config.parentProjects.map(p => workspaces.get(p)).filter(x => x);
	activeConfigs.set(configBaseDir, config);
}

export async function removeConfig(configPath: string) {
	const configBaseDir: ConfigBaseDir = path.dirname(configPath);
	activeConfigs.delete(configBaseDir);
}

/**
 * Absolute paths.
 */
export interface FinderPaths {
	/**
	 * Absolute path to the active routine.
	 */
	activeRoutine: string;

	/**
	 * Absolute paths to all possible sources for PSL classes, across all projects. Ordered by priority.
	 */
	projectPsl: string[];

	/**
	 * Absolute path to the location of PSL core class definitions.
	 */
	corePsl: string;

	/**
	 * Absolute path to the directory that contains file definitions.
	 */
	table: string;
}

export function getFinderPaths(childDir: string, activeRoutine?: string): FinderPaths {
	const corePsl = '.vscode/pslcls/';
	const defaultPslSources = ['dataqwik/procedure/', 'psl/'];
	const defaultFileDefinitionSources = 'dataqwik/table/';

	const config: ProjectConfig | undefined = activeConfigs.get(childDir);

	const projectPsl = [];
	const load = (base, source) => projectPsl.push(path.join(base, source));
	const relativePslSources = config && config.pslSources ? config.pslSources : defaultPslSources;

	// load core first
	projectPsl.push(corePsl);

	// load base sources
	relativePslSources.forEach(source => load(childDir, source));

	// load parent sources
	if (config && config.parentProjects) {
		config.parentProjects.forEach(parent => relativePslSources.forEach(source => load(parent, source)));
	}

	const relativeFileDefinitionSource = config && config.fileDefinitionSources ?
		config.fileDefinitionSources[0] : defaultFileDefinitionSources;
	const table = relativeFileDefinitionSource;

	return {
		activeRoutine,
		corePsl,
		projectPsl,
		table,
	};
}
