export interface Logger {
  id(): string;
  d(...args: any[]): void;
  i(...args: any[]): void;
  w(...args: any[]): void;
  e(...args: any[]): void;
  f(
    l: string,
    fn: (log: (...args: any[]) => void) => void,
    fl?: string,
    ...fargs: any[]
  ): boolean;
  callback(next?: Function): Function;
  logdb(opname: string, next?: Function, nextError?: Function): Function;
  sub(subname: string): Logger;
}

declare function createLogger(name: string): Logger;
export default createLogger;
