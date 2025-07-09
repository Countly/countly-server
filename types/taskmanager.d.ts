// Type definitions for Countly Task Manager
// Generated from /api/utils/taskmanager.js

import { Db } from "mongodb";

export interface TaskManagerParams {
  app_id?: string;
  qstring?: Record<string, any>;
  fullPath?: string;
  member?: { _id: string };
}

export interface TaskManagerOptions {
  /** Database connection */
  db?: Db;
  /** Parameters object */
  params?: TaskManagerParams;
  /** Amount of seconds to wait before switching to long running task */
  threshold?: number;
  /** Force to use taskmanager, ignoring threshold */
  force?: boolean;
  /** Type of data, as which module or plugin uses this data */
  type?: string;
  /** Any information about the task */
  meta?: string;
  /** User friendly task running condition string */
  name?: string;
  /** Name inputted by user create from report form */
  report_name?: string;
  /** Report desc from report form */
  report_desc?: string;
  /** Target period report data from report form */
  period_desc?: string;
  /** Browser side view hash prepended with job id to display result */
  view?: string;
  /** ID of the app for which data is meant for */
  app_id?: string;
  /** Function to post process fetched data */
  processData?: (err: any, data: any, callback: (err: any, data: any) => void) => void;
  /** Function to feed post processed data */
  outputData?: (err: any, data: any) => void;
  /** The task creator */
  creator?: string;
  /** Whether the task is private or global visit */
  global?: boolean;
  /** Whether the task will auto run periodically */
  autoRefresh?: boolean;
  /** The task local hour of time to run, when autoRefresh is true */
  r_hour?: number;
  /** Force createTask with id supplied (for import) */
  forceCreateTask?: boolean;
  /** Store result in gridfs instead of MongoDB document */
  gridfs?: boolean;
  /** Task ID */
  id?: string;
  /** Start time of the task in milliseconds */
  start?: number;
  /** Request object for rerunning the task */
  request?: {
    uri: string;
    method: string;
    json: Record<string, any>;
  };
  /** Whether the task errored */
  errored?: boolean;
  /** Error message */
  errormsg?: string;
  /** Error object */
  error?: {
    message?: string;
    code?: number;
    errormsg?: string;
  };
  /** Whether this is manually created */
  manually_create?: boolean;
  /** Subtask key */
  subtask_key?: string;
  /** Whether this is a task group */
  taskgroup?: boolean;
  /** Parent task ID for subtasks */
  subtask?: string;
  /** Task this is linked to */
  linked_to?: string;
  /** Whether result is stored as binary */
  binary?: boolean;
  /** Query for finding tasks */
  query?: Record<string, any>;
  /** Projection for database queries */
  projection?: Record<string, any>;
  /** Whether to only return info without data */
  only_info?: boolean;
  /** Data to modify task with */
  data?: Record<string, any>;
  /** Page information for pagination */
  page?: {
    skip: string | number;
    limit: string | number;
  };
  /** Keyword for searching tasks */
  keyword?: string;
  /** Sort configuration */
  sort?: {
    sortBy?: string;
    sortSeq?: "desc" | "asc";
  };
}

export interface TaskResult {
  _id: string;
  ts: number;
  start: number;
  end?: number;
  status: "running" | "completed" | "errored" | "stopped" | "rerunning";
  type: string;
  meta: string;
  name: string | null;
  view: string;
  request: string;
  app_id: string;
  creator: string;
  global: boolean;
  r_hour: number;
  autoRefresh: boolean;
  report_name: string;
  report_desc: string;
  period_desc: string;
  manually_create: boolean;
  subtask_key: string;
  taskgroup: boolean;
  linked_to?: string;
  subtask?: string;
  subtasks?: Record<string, {
    status: string;
    start: number;
    end?: number;
    hasData?: boolean;
    errormsg?: string;
  }>;
  hasData?: boolean;
  data?: string;
  errormsg?: string;
  gridfs?: boolean;
  dirty?: number | boolean;
  result?: string;
}

export interface TaskRuleOptions {
  rules: Record<string, any>;
}

export interface TaskCountResult {
  _id: string;
  c: number;
}

export interface TaskManagerStatic {
  /**
   * Monitors DB query or potentially long task and switches to long task manager if exceeds threshold
   */
  longtask(options: TaskManagerOptions): (err: any, res: any) => void;

  /**
   * Generates ID for the task
   */
  getId(): string;

  /**
   * Create task with data, without result
   */
  createTask(options: TaskManagerOptions, callback?: (err: any, res: any) => void): void;

  /**
   * Mark reports dirty based on rule
   */
  markReportsDirtyBasedOnRule(options: TaskRuleOptions, callback?: () => void): void;

  /**
   * Save result from the task
   */
  saveResult(options: TaskManagerOptions, data: any, callback?: (err: any, res: any) => void): void;

  /**
   * Give a name to task result or rename it
   */
  nameResult(options: TaskManagerOptions, data: any, callback?: (err: any, res: any) => void): void;

  /**
   * Get specific task result
   */
  getResult(options: TaskManagerOptions, callback: (err: any, result: TaskResult | null) => void): void;

  /**
   * Get specific task result by query
   */
  getResultByQuery(options: TaskManagerOptions, callback: (err: any, result: TaskResult | null) => void): void;

  /**
   * Edit specific task
   */
  editTask(options: TaskManagerOptions, callback: (err: any, result: { before: TaskResult; after: Record<string, any> } | null) => void): void;

  /**
   * Check tasks status
   */
  checkResult(options: TaskManagerOptions, callback: (err: any, result?: any) => void): void;

  /**
   * Check if task like that is already running or not
   */
  checkIfRunning(options: TaskManagerOptions, callback: (result: string | false) => void): void;

  /**
   * Get multiple task results based on query
   */
  getResults(options: TaskManagerOptions, callback: (err: any, results: TaskResult[]) => void): void;

  /**
   * Get task counts based on query and grouped by app_id
   */
  getCounts(options: TaskManagerOptions, callback: (err: any, results: TaskCountResult[]) => void): void;

  /**
   * Get dataTable query results for tasks
   */
  getTableQueryResult(options: TaskManagerOptions, callback: (err: any, result: { data: TaskResult[]; recordsTotal: number; recordsFiltered: number }) => void): Promise<void>;

  /**
   * Delete specific task
   */
  deleteResult(options: TaskManagerOptions, callback?: (err: any, res: any) => void): void;

  /**
   * Rerun specific task
   */
  rerunTask(options: TaskManagerOptions, callback?: (err: any, result: any) => void): void;

  /**
   * Get progress for task
   */
  getProgress(id: string, callback: (err: any, progress: any) => void): void;

  /**
   * Update status of running task if process crashed
   */
  errorResults(options: TaskManagerOptions): void;
}

declare const taskmanager: TaskManagerStatic;
export default taskmanager;
