import { Params } from "../../utils/common";

export interface CmsApi {
  getEntriesWithUpdate(params: Params): boolean;
  getEntries(params: Params): boolean;
  saveEntries(params: Params): void;
  clearCache(params: Params): void;
}

declare const cmsApi: CmsApi;
export default cmsApi;
