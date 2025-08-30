import { Params } from "../../utils/common";

export interface EventGroupsApi {
  create(params: Params): void;
  update(params: Params): void;
  remove(params: Params): void;
}

declare const eventGroupsApi: EventGroupsApi;
export default eventGroupsApi;
