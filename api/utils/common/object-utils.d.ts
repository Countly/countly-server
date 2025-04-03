/**
 * Module for object and data manipulation utilities
 * @module api/utils/common/object-utils
 */

declare module "api/utils/common/object-utils" {
  /**
   * Fetches nested property values from an obj.
   * @param {object} obj - standard countly metric object
   * @param {string} desc - dot separate path to fetch from object
   * @returns {object} fetched object from provided path
   * @example
   * //outputs {"u":20,"t":20,"n":5}
   * getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
   */
  export function getDescendantProp(obj: object, desc: string): any;

  /**
   * Checks if provided value could be converted to a number,
   * even if current type is other, as string, as example value "42"
   * @param {any} n - value to check if it can be converted to number
   * @returns {boolean} true if can be a number, false if can't be a number
   * @example
   * isNumber(1) //outputs true
   * isNumber("2") //outputs true
   * isNumber("test") //outputs false
   */
  export function isNumber(n: any): boolean;

  /**
   * This default Countly behavior of type conversion for storing proeprties accepted through API requests
   * dealing with numbers as strings and too long numbers
   * @param {any} value - value to convert to usable type
   * @param {boolean} preventParsingToNumber - do not change value to number (e.g. "1", ["1"]);
   * @returns {varies} converted value
   * @example
   * convertToType(1) //outputs 1
   * convertToType("2") //outputs 2
   * convertToType("test") //outputs "test"
   * convertToType("12345678901234567890") //outputs "12345678901234567890"
   */
  export function convertToType(
    value: any,
    preventParsingToNumber?: boolean
  ): any;

  /**
   * Safe division between numbers providing 0 as result in cases when dividing by 0
   * @param {number} dividend - number which to divide
   * @param {number} divisor - number by which to divide
   * @returns {number} result of division
   * @example
   * //outputs 0
   * safeDivision(100, 0);
   */
  export function safeDivision(dividend: number, divisor: number): number;

  /**
   * Pad number with specified character from left to specified length
   * @param {number} number - number to pad
   * @param {number} width - pad to what length in symbols
   * @returns {string} padded number
   * @example
   * //outputs 0012
   * zeroFill(12, 4, "0");
   */
  export function zeroFill(number: number, width: number): string;

  /**
   * Add item or array to existing array only if values are not already in original array
   * @param {array} arr - original array where to add unique elements
   * @param {string|number|array} item - item to add or array to merge
   */
  export function arrayAddUniq(arr: any[], item: string | number | any[]): void;

  /**
   * Fix event keys before storing in database by removing dots and $ from the string, removing other prefixes and limiting length
   * @param {string} eventKey - key value to fix
   * @returns {string|false} escaped key or false if not possible to use key at all
   */
  export function fixEventKey(eventKey: string): string | false;

  /**
   * Getter/setter for dot notatons:
   * @param {object} obj - object to use
   * @param {string} is - path of properties to get
   * @param {varies} value - value to set
   * @returns {varies} value at provided path
   * @example
   * dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
   * dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
   * dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
   * dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
   */
  export function dot(obj: object, is: string | string[], value?: any): any;

  /**
   * Not deep object and primitive type comparison function
   *
   * @param  {Any} a object to compare
   * @param  {Any} b object to compare
   * @param  {Boolean} checkFromA true if check should be performed agains keys of a, resulting in true even if b has more keys
   * @return {Boolean} true if objects are equal, false if different types or not equal
   */
  export function equal(a: any, b: any, checkFromA?: boolean): boolean;

  /**
   * Returns plain object with key set to value
   * @param {varies} arguments - every odd value will be used as key and every event value as value for odd key
   * @returns {object} new object with set key/value properties
   */
  export function o(...args: any[]): object;

  /**
   * Return index of array with objects where property = value
   * @param {array} array - array where to search value
   * @param {string} property - property where to look for value
   * @param {varies} value - value you are searching for
   * @returns {number} index of the array
   */
  export function indexOf(array: any[], property: string, value: any): number;

  /**
   * Optionally load module if it exists
   * @param {string} module - module name
   * @param {object} options - additional opeitons
   * @param {boolean} options.rethrow - throw exception if there is some other error
   * @param {varies} value - value you are searching for
   * @returns {number} index of the array
   */
  export function optional(
    module: string,
    options?: { rethrow?: boolean }
  ): any;

  /**
   * Compares two version strings with : as delimiter (which we used to escape dots in app versions)
   * @param {string} v1 - first version
   * @param {string} v2 - second version
   * @param {object} options - providing additional options
   * @param {string} options.delimiter - delimiter between version, subversion, etc, defaults :
   * @returns {number} 0 if they are both the same, 1 if first one is higher and -1 is second one is higher
   */
  export function versionCompare(
    v1: string,
    v2: string,
    options?: { delimiter?: string }
  ): number;

  /**
   * Promise that tries to catch errors
   * @param  {function} f function which is usually passed to Promise constructor
   * @return {Promise}   Promise with constructor catching errors by rejecting the promise
   */
  export function p(
    f: (resolve: (value: any) => void, reject: (reason?: any) => void) => void
  ): Promise<any>;

  /**
   * Revive json encoded data, as for example, regular expressions
   * @param {string} key - key of json object
   * @param {vary} value - value of json object
   * @returns {vary} modified value, if it had revivable data
   */
  export function reviver(key: string, value: any): any;
}
