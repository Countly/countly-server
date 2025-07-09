/**
 * Configuration extender module for environment variable overrides
 */

export interface ConfigExtenderOptions {
  [key: string]: string | number | boolean | object;
}

export declare function extendWithEnvironment(config: Record<string, any>, prefix?: string): void;
export declare function extend(config: Record<string, any>, overrides: Record<string, any>): void;

declare const configextender: {
  extendWithEnvironment: typeof extendWithEnvironment;
  extend: typeof extend;
};
export default configextender;
