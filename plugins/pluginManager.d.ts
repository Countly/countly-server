declare const pluginManager: {
  init: () => void;
  loadConfigs: (db: any, callback: () => void) => void;
  setConfigs: (
    namespace: string,
    conf: any,
    exclude: boolean,
    onchange: () => void
  ) => void;
  getConfig: (namespace: string, userSettings?: any, override?: boolean) => any;
  getAllConfigs: () => any;
  getUserConfigs: (userSettings?: any) => any;
  dispatch: (event: string, data: any) => any;
  getPlugins: () => string[];
  processPluginInstall: (
    db: any,
    pluginName: string,
    callback: () => void
  ) => void;
  connectToAllDatabases: () => Promise<any[]>;
  addCollectionToExpireList: (collection: string) => void;
  getExpireList: () => string[];
  setUserConfigs: (namespace: string, conf: any) => void;
  loadDependencyMap: () => void;
  installMissingPlugins: (db: any, callback?: () => void) => void;
  reloadEnabledPluginList: (db: any, callback?: () => void) => void;
  fetchMaskingConf: (options: any) => void;
};

export = pluginManager;
