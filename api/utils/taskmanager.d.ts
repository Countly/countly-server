import { Db } from "mongodb";
import { Params } from "./common";

export interface TaskManagerOptions {
  db: Db;
  params: Params;
  threshold: number;
  force: boolean;
  type: string;
  meta: any;
  name: string;
  report_name: string;
  report_desc: string;
  period_desc: string;
  view: string;
  app_id: string;
  processData: (
    err: any,
    res: any,
    callback: (err: any, res: any) => void
  ) => void;
  outputData: (err: any, data: any) => void;
  creator?: string;
  global?: boolean;
  autoRefresh?: boolean;
  r_hour?: number;
  forceCreateTask?: boolean;
  gridfs?: boolean;
  binary?: boolean;
  id?: string;
  start?: number;
  errored?: boolean;
  errormsg?: any;
  request?: any;
  subtask?: string;
  subtask_key?: string;
  linked_to?: string;
}

export interface TaskManager {
  longtask(options: TaskManagerOptions): (err: any, res: any) => void;
  getId(): string;
  createTask(
    options: TaskManagerOptions,
    callback?: (err: any, result: any) => void
  ): void;
  saveResult(
    options: TaskManagerOptions,
    data: any,
    callback?: (err: any, result: any) => void
  ): void;
  nameResult(
    options: { db: Db; id: string; name: string },
    data: any,
    callback?: (err: any, result: any) => void
  ): void;
  checkIfRunning(
    options: { db: Db; params: Params },
    callback: (taskId: string) => void
  ): void;
  getResult(
    options: { db: Db; id: string; subtask_key?: string },
    callback: (err: any, result: any) => void
  ): void;
  getResults(
    options: { db: Db; query: any },
    callback: (err: any, result: any) => void
  ): void;
  getCounts(
    options: { db: Db; query: any },
    callback: (err: any, result: any) => void
  ): void;
  editTask(
    options: { db: Db; id: string; data: any },
    callback: (err: any, result: any) => void
  ): void;
  deleteResult(
    options: { db: Db; id: string },
    callback: (err: any, task: any) => void
  ): void;
  getTableQueryResult(
    options: { db: Db; query: any; page: any; sort: any; keyword: any },
    callback: (err: any, result: any) => void
  ): void;
  markReportsDirtyBasedOnRule(
    options: { db: Db; rules: any },
    callback: () => void
  ): void;
}

declare const taskmanager: TaskManager;

export default taskmanager;
