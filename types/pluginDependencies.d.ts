/**
 * Plugin dependencies management module
 */

export interface PluginDependencyInfo {
  dependencies?: string[];
  soft_dependencies?: string[];
  [key: string]: string[] | string | boolean | undefined;
}

export interface DependencyMap {
  [pluginName: string]: PluginDependencyInfo;
}

export declare function getFixedPluginList(pluginsList: string[] | DependencyMap, options: { discoveryStrategy: string; overwrite: string }): string[];

declare const pluginDependencies: {
  getFixedPluginList: typeof getFixedPluginList;
};
export default pluginDependencies;
