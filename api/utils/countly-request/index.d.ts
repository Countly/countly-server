/**
 * @module api/utils/countly-request
 */

import * as got from "got";
import { FormData } from "form-data";
import { HttpsProxyAgent, HttpProxyAgent } from "hpagent";

/**
 * Configuration for Countly request
 */
export interface CountlyConfig {
  /**
   * Proxy hostname
   */
  proxy_hostname?: string;

  /**
   * Proxy port
   */
  proxy_port?: number;

  /**
   * Proxy username
   */
  proxy_username?: string;

  /**
   * Proxy password
   */
  proxy_password?: string;
}

/**
 * File data for uploading
 */
export interface FileData {
  /**
   * Name of the field to upload file as
   */
  fileField: string;

  /**
   * File stream to upload
   */
  fileStream: any;
}

/**
 * Request options
 */
export interface RequestOptions {
  /**
   * URL to make the request to
   */
  url?: string;

  /**
   * URI to make the request to (alias for url)
   */
  uri?: string;

  /**
   * Query string parameters
   */
  qs?: Record<string, any>;

  /**
   * Whether to verify SSL certificates
   */
  strictSSL?: boolean;

  /**
   * Whether to decompress the response
   */
  gzip?: boolean;

  /**
   * Cookie jar
   */
  jar?: any;

  /**
   * Base URL
   */
  baseUrl?: string;

  /**
   * Request body
   */
  body?: any;

  /**
   * JSON body
   */
  json?: boolean | any;

  /**
   * Form data
   */
  form?: Record<string, any> & {
    fileStream?: any;
    fileField?: string;
  };

  /**
   * Agent options
   */
  agent?: {
    https?: HttpsProxyAgent | HttpProxyAgent;
  };

  /**
   * Any other options
   */
  [key: string]: any;
}

/**
 * Callback function for HTTP requests
 */
export type RequestCallback = (
  error: Error | null,
  response?: any,
  body?: any
) => void;

/**
 * Request function
 */
export interface RequestFunction {
  /**
   * Make an HTTP request
   * @param uri - URI to make the request to or options object
   * @param options - Request options
   * @param callback - Callback function
   * @param config - Countly configuration
   */
  (
    uri: string | RequestOptions,
    options?: RequestOptions | RequestCallback,
    callback?: RequestCallback,
    config?: CountlyConfig
  ): void;

  /**
   * Make a GET request
   * @param uri - URI to make the request to or options object
   * @param options - Request options
   * @param callback - Callback function
   * @param config - Countly configuration
   */
  get(
    uri: string | RequestOptions,
    options?: RequestOptions | RequestCallback,
    callback?: RequestCallback,
    config?: CountlyConfig
  ): void;

  /**
   * Make a POST request
   * @param uri - URI to make the request to or options object
   * @param options - Request options
   * @param callback - Callback function
   * @param config - Countly configuration
   */
  post(
    uri: string | RequestOptions,
    options?: RequestOptions | RequestCallback,
    callback?: RequestCallback,
    config?: CountlyConfig
  ): void;

  /**
   * Convert request options to got options
   * @param options - Request options
   * @returns Got options
   */
  convertOptionsToGot(options: RequestOptions): Record<string, any> | null;
}

/**
 * Convert request options to got options
 * @param options - Request options
 * @returns Got options
 */
export function convertOptionsToGot(
  options: RequestOptions
): Record<string, any> | null;

/**
 * Factory function to initialize with config
 * @param countlyConfig - Countly configuration
 * @returns Request function
 */
declare function requestFactory(countlyConfig?: CountlyConfig): RequestFunction;

export = requestFactory;
