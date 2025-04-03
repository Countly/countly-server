import { Params } from "../../utils/common";

export interface Fetch {
  prefetchEventData(collection: string, params: Params): void;
  fetchEventData(collection: string, params: Params): void;
  fetchEventGroupById(params: Params): void;
  fetchEventGroups(params: Params): void;
  fetchMergedEventGroups(params: Params): void;
  getMergedEventGroups(
    params: Params,
    event: string,
    options: any,
    callback: Function
  ): void;
  fetchMergedEventData(params: Params): void;
  getMergedEventData(
    params: Params,
    events: string[],
    options: any,
    callback: Function
  ): void;
  fetchCollection(collection: string, params: Params): void;
  fetchTimeData(collection: string, params: Params): void;
  fetchDashboard(params: Params): void;
  fetchAllApps(params: Params): void;
  fetchTotalUsersObj(
    collection: string,
    params: Params,
    callback: Function
  ): void;
  getPeriodObj(params: Params): void;
}

declare const fetch: Fetch;
export default fetch;
