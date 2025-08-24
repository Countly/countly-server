import { Params } from "../../utils/common";

export interface AppUsersApi {
  create(app_id: string, doc: any, params: Params, callback: Function): void;
  update(
    app_id: string,
    query: any,
    update: any,
    params: Params,
    callback: Function
  ): void;
  delete(app_id: string, query: any, params: Params, callback: Function): void;
  search(
    app_id: string,
    query: any,
    project: any,
    sort: any,
    limit: number,
    skip: number,
    callback: Function
  ): void;
  count(app_id: string, query: any, callback: Function): void;
  getUid(app_id: string, callback: Function): void;
  mergeOtherPlugins(options: any, callback: Function): void;
  deleteExport(id: string, params: Params, callback: Function): void;
  export(app_id: string, query: any, params: Params, taskmanager: any): void;
}

declare const usersApi: AppUsersApi;
export default usersApi;
