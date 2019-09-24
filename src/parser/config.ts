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
	 * Absolute path to the active routine, if the active component is a routine.
	 */
	activeRoutine?: string;

	/**
	 * Absolute path to the active table, if the active component is a table.
	 */
	activeTable?: string;

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
	tables: string[];
}

export function getFinderPaths(currentDir: string, activeRoutine?: string): FinderPaths {

	const defaultPslSources = ['dataqwik/procedure/', 'psl/'];
	const defaultFileDefinitionSources = ['dataqwik/table/'];

	const config: ProjectConfig | undefined = activeConfigs.get(currentDir);

	const projectPsl = [];
	const tables = [];

	const loadPsl = (base, source) => projectPsl.push(path.join(base, source));
	const loadFileDefinition = (base, source) => tables.push(path.join(base, source));

	const relativePslSources = config && config.pslSources ? config.pslSources : defaultPslSources;
	const relativeFileDefinitionSource = config && config.fileDefinitionSources ?
		config.fileDefinitionSources : defaultFileDefinitionSources;

	const corePsl = path.join(currentDir, '.vscode/pslcls/');
	// load core first
	projectPsl.push(corePsl);

	// load base sources
	relativePslSources.forEach(source => loadPsl(currentDir, source));
	relativeFileDefinitionSource.forEach(source => loadFileDefinition(currentDir, source));

	// load parent sources
	if (config && config.parentProjects) {
		for (const parent of config.parentProjects) {
			relativePslSources.forEach(source => loadPsl(parent, source));
			relativeFileDefinitionSource.forEach(source => loadFileDefinition(parent, source));
		}

	}

	return {
		activeRoutine,
		corePsl,
		projectPsl,
		tables,
	};
}
