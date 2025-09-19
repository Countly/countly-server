import { Db } from "mongodb";
import { IPC } from "./ipc";
import { Job } from "./job";

export class Handle {
  static instance: Handle;
  db: Db;
  classes: { [key: string]: any };
  files: { [key: string]: string };
  job(name: string, data: any): Job;
  runTransient(name: string, data: any): Promise<any>;
  get ipc(): IPC;
  suspendJob(params: any): Promise<any>;
}
