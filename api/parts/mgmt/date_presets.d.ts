import { Params } from "../../utils/common";

export interface DatePresetsApi {
  getAll(params: Params): boolean;
  getById(params: Params): boolean;
  create(params: Params): boolean;
  update(params: Params): boolean;
  delete(params: Params): boolean;
}

declare const datePresetsApi: DatePresetsApi;
export default datePresetsApi;
