export type logFunction = (...args: any[]) => void;
export interface LogObject {
    d: logFunction;
    i: logFunction;
    w: logFunction;
    e: logFunction;
}

/** this is only a partial decleration only to be used in push */
export interface CountlyCommon {
    initTimeObj: (timezone: string, timestamp: number) => unknown;
    plugins: {
        dispatchAsPromise: (eventName: string, obj: unknown) => Promise<undefined>
    }
}