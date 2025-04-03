/**
 * Module for miscellaneous utility functions
 * @module api/utils/common/misc-utils
 */

declare module "api/utils/common/misc-utils" {
  /**
   * Create promise for function which result should be checked periodically
   * @param {function} func - function to run when verifying result, should return true if success
   * @param {number} count - how many times to run the func before giving up, if result is always negative
   * @param {number} interval - how often to retest function on negative result in miliseconds
   * @returns {Promise} promise for checking task
   */
  export function checkPromise(
    func: () => boolean,
    count: number,
    interval: number
  ): Promise<void>;

  /**
   * Update carrier from metrics to convert mnc/mcc code to carrier name
   * @param {object} metrics - metrics object from SDK request
   */
  export function processCarrier(metrics: any): void;

  /**
   * Parse Sequence
   * @param {number} num - sequence number for id
   * @returns {string} converted to base 62 number
   */
  export function parseSequence(num: number): string;

  /**
   * Sync license check results to request (and session if present)
   *
   * @param {object} req request
   * @param {object|undefined} check check results
   */
  export function licenseAssign(req: any, check: any): void;

  /**
   * Check db host match for both of API and Frontend config
   * @param {object} apiConfig - mongodb object from API config
   * @param {object} frontendConfig - mongodb object from Frontend config
   * @returns {boolean} isMatched - is config correct?
   */
  export function checkDatabaseConfigMatch(
    apiConfig: any,
    frontendConfig: any
  ): boolean;
}
