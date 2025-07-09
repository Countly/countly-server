/**
 * Global type declarations for legacy JavaScript compatibility
 */

// Legacy type aliases used in JSDoc comments
declare type integer = number;
declare type varies = any;
declare type timeObject = any;

// Global variables that might be referenced
declare var Db: any;
declare var Resource: any;
declare var RetryPolicy: any;

// Extend global object with common properties
declare global {
  var integer: number;
  var varies: any;
  var timeObject: any;
  
  // Make all objects indexable for legacy code patterns
  interface Object {
    [key: string]: any;
    [key: number]: any;
  }
  
  // Make arrays more permissive for legacy code
  interface Array<T> {
    [key: string]: any;
  }
  
  // Make strings support assignment and property access
  interface String {
    [key: string]: any;
    valueOf(): string | number;
  }
  
  // Make numbers support property access
  interface Number {
    [key: string]: any;
    valueOf(): string | number;
  }
  
  // Allow underscore.js methods
  interface UnderscoreStatic {
    countBy<T>(list: T[], iteratee?: string | ((value: T) => any)): Record<string, number>;
    uniq<T>(array: T[], isSorted?: boolean, iteratee?: (value: T) => any): T[];
    difference<T>(array: T[], ...others: T[][]): T[];
    [key: string]: any;
  }
}


// Allow any module to be imported
declare module "*" {
  const content: any;
  export = content;
}

export {};