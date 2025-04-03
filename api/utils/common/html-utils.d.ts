/**
 * Module for HTML and string manipulation utilities
 * @module api/utils/common/html-utils
 */

declare module "api/utils/common/html-utils" {
  /**
   * Escape special characters in the given string of html.
   * @param  {string} string - The string to escape for inserting into HTML
   * @param  {bool} more - if false, escapes only tags, if true escapes also quotes and ampersands
   * @returns {string} escaped string
   **/
  export function escape_html(string: string, more?: boolean): string;

  /**
   * Function to escape unicode characters
   * @param {string} str  - string for which to escape
   * @returns  {string} escaped string
   */
  export function encodeCharacters(str: string): string;

  /**
   * Decode escaped html
   * @param  {string} string - The string to decode
   * @returns {string} escaped string
   **/
  export function decode_html(string: string): string;

  /**
   * Check if string is a valid json
   * @param {string} val - string that might be json encoded
   * @returns {object} with property data for parsed data and property valid to check if it was valid json encoded string or not
   **/
  export function getJSON(val: string): { valid: boolean; data?: any };

  /**
   * Escape special characters in the given value, may be nested object
   * @param  {string} key - key of the value
   * @param  {vary} value - value to escape
   * @param  {bool} more - if false, escapes only tags, if true escapes also quotes and ampersands
   * @returns {vary} escaped value
   **/
  export function escape_html_entities(
    key: string,
    value: any,
    more?: boolean
  ): any;

  /**
   * Sanitizes a filename to prevent directory traversals and such.
   * @param {string} filename - filename to sanitize
   * @param {string} replacement - string to replace characters to be removed
   * @returns {string} sanitizedFilename - sanitized filename
   */
  export function sanitizeFilename(
    filename: string,
    replacement?: string
  ): string;

  /**
   * Sanitizes html content by allowing only safe tags
   * @param {string} html - html content to sanitize
   * @param {object} extendedWhitelist - extended whitelist of tags to allow
   * @returns {string} sanitizedHTML - sanitized html content
   */
  export function sanitizeHTML(
    html: string,
    extendedWhitelist?: object
  ): string;

  /**
   * Remove spaces, tabs, and newlines from the start and end from all levels of a nested object
   * @param {any} value - Arbitrary value
   * @returns {any} Trimmed value
   */
  export function trimWhitespaceStartEnd(value: any): any;
}
