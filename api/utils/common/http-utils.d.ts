/**
 * Module for HTTP request/response utility functions
 * @module api/utils/common/http-utils
 */

declare module "api/utils/common/http-utils" {
  import { IncomingMessage, ServerResponse } from "http";

  /**
   * Custom API response handler callback
   * @typedef APICallback
   * @callback APICallback
   * @type {function}
   * @global
   * @param {bool} error - true if there was problem processing request, and false if request was processed successfully
   * @param {string} responseMessage - what API returns
   * @param {object} headers - what API would have returned to HTTP request
   * @param {number} returnCode - HTTP code, what API would have returned to HTTP request
   * @param {params} params - request context that was passed to requestProcessor, modified during request processing
   */
  export type APICallback = (
    error: boolean,
    responseMessage: string,
    headers: { [key: string]: string } | undefined,
    returnCode: number,
    params: any
  ) => void;

  /**
   * Block {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} from ouputting anything
   * @param {params} params - params object
   */
  export function blockResponses(params: any): void;

  /**
   * Unblock/allow {@link module:api/utils/common.returnMessage} and {@link module:api/utils/common.returnOutput} ouputting anything
   * @param {params} params - params object
   */
  export function unblockResponses(params: any): void;

  /**
   * Return raw headers and body
   * @param {params} params - params object
   * @param {number} returnCode - http code to use
   * @param {string} body - raw data to output
   * @param {object} heads - headers to add to the output
   */
  export function returnRaw(
    params: any,
    returnCode: number,
    body: string,
    heads?: { [key: string]: string }
  ): void;

  /**
   * Output message as request response with provided http code
   * @param {params} params - params object
   * @param {number} returnCode - http code to use
   * @param {string|object} message - Message to output, will be encapsulated in JSON object under result property
   * @param {object} heads - headers to add to the output
   * @param {boolean} noResult - skip wrapping message object into stupid {result: }
   */
  export function returnMessage(
    params: any,
    returnCode: number,
    message: string | object,
    heads?: { [key: string]: string },
    noResult?: boolean
  ): void;

  /**
   * Output message as request response with provided http code
   * @param {params} params - params object
   * @param {output} output - object to stringify and output
   * @param {string} noescape - prevent escaping HTML entities
   * @param {object} heads - headers to add to the output
   */
  export function returnOutput(
    params: any,
    output: any,
    noescape?: string,
    heads?: { [key: string]: string }
  ): void;
}
