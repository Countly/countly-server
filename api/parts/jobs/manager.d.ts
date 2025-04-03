import { Db } from "mongodb";
import { Job } from "./job";
import { IPC } from "./ipc";

export interface ManagerOptions {
  db: Db;
}

export class Manager {
  constructor();
  classes: { [key: string]: any };
  types: string[];
  files: { [key: string]: string };
  processes: { [key: string]: any[] };
  running: { [key: string]: any[] };
  resources: any[];
  db: Db;
  collection: any;
  checkingAfterDelay: boolean;
  job(name: string, data: any): Job;
  checkAfterDelay(delay?: number): void;
  check(): void;
  process(jobs: any[]): Promise<void>;
  schedule(job: any): Promise<any>;
  start(job: any): Promise<any>;
  runIPC(job: any): Promise<any>;
  canRun(job: any, count?: number): boolean;
  getPool(job: any): any;
  getResource(job: any): any;
  hasResources(job: any): boolean;
  readonly ipc: IPC;
}
