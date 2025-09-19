import { Params } from "../../utils/common";

export interface Usage {
  setLocation(params: Params): Promise<void>;
  setUserLocation(params: Params, loc: any): void;
  processSessionDuration(params: Params, callback: Function): void;
  getPredefinedMetrics(params: Params, userProps: any): any[];
  returnAllProcessedMetrics(params: Params): any;
  processSessionDurationRange(
    totalSessionDuration: number,
    params: Params,
    done: Function
  ): void;
}

declare const usage: Usage;
export default usage;
