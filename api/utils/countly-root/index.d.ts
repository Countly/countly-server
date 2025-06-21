import * as path from "path";

/**
 * Resolves the given relative path to absolute from Countly repository root path.
 * @param relativePath The path relative to Countly root directory.
 * @returns The absolute path resolved for the given relative path.
 */
declare function fromCountlyRoot(relativePath: string): string;

export = fromCountlyRoot;
