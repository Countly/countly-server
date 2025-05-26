export type logFunction = (...args: any[]) => void;
export interface LogObject {
    d: logFunction;
    i: logFunction;
    w: logFunction;
    e: logFunction;
}