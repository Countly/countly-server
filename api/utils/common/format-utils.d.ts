/**
 * Module for formatting utility functions
 * @module api/utils/common/format-utils
 */

declare module "api/utils/common/format-utils" {
  /**
   * Standard number formatter, taken from frontend's countly.common.js
   *
   * @memberof countlyCommon
   * @param {number} x - number to format
   * @returns {string} formatted number
   * @example
   * //outputs 1,234,567
   * formatNumber(1234567);
   */
  export function formatNumber(x: number): string;

  /**
   * Second formatter
   *
   * @memberof countlyCommon
   * @param {number} number - number of seconds to format
   * @returns {string} formatted seconds
   */
  export function formatSecond(number: number): string;
}
