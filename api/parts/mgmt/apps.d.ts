import { Params } from "../../utils/common";

export interface AppsApi {
  getAllApps(params: Params): boolean;
  getCurrentUserApps(params: Params): boolean;
  getAppsDetails(params: Params): boolean;
  createApp(params: Params): Promise<boolean>;
  updateApp(params: Params): boolean;
  deleteApp(params: Params): boolean;
  resetApp(params: Params): boolean;
  getAppPlugins(params: Params): Promise<boolean>;
  updateAppPlugins(params: Params): boolean;
}

declare const appsApi: AppsApi;
export default appsApi;
