/**
 * Module for validation utility functions
 * @module api/utils/common/validation-utils
 */

declare module "api/utils/common/validation-utils" {
  import { ObjectId } from "mongodb";

  /**
   * Validates provided arguments
   * @param {object} args - arguments to validate
   * @param {object} argProperties - rules for validating each argument
   * @param {boolean} argProperties.required - should property be present in args
   * @param {string} argProperties.type - what type should property be, possible values: String, Array, Number, URL, Boolean, Object, Email
   * @param {string} argProperties.max-length - property should not be longer than provided value
   * @param {string} argProperties.min-length - property should not be shorter than provided value
   * @param {string} argProperties.exclude-from-ret-obj - should property be present in returned validated args object
   * @param {string} argProperties.has-number - should string property has any number in it
   * @param {string} argProperties.has-char - should string property has any latin character in it
   * @param {string} argProperties.has-upchar - should string property has any upper cased latin character in it
   * @param {string} argProperties.has-special - should string property has any none latin character in it
   * @param {boolean} returnErrors - return error details as array or only boolean result
   * @returns {object} validated args in obj property, or false as result property if args do not pass validation and errors array
   */
  export function validateArgs(
    args: any,
    argProperties: any,
    returnErrors?: boolean
  ): any;
}
