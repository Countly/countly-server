/**
 * Module rendering views as images
 * @module api/utils/render
 */

import * as puppeteer from "puppeteer";
import { Logger } from "./log";
import * as countlyFs from "./countlyFs";

/**
 * Dimensions for the screenshot
 */
export interface RenderDimensions {
  /**
   * The width of the screenshot
   */
  width?: number;

  /**
   * The height of the screenshot
   */
  height?: number;

  /**
   * The padding value to subtract from the height of the screenshot
   */
  padding?: number;

  /**
   * The scale(ppi) value of the screenshot
   */
  scale?: number;
}

/**
 * Options for rendering a view
 */
export interface RenderViewOptions {
  /**
   * The hostname
   */
  host?: string;

  /**
   * The login token value
   */
  token: string;

  /**
   * The view to open
   */
  view: string;

  /**
   * The id of the block to capture screenshot of
   */
  id?: string;

  /**
   * Path where to save the screenshot
   */
  savePath?: string;

  /**
   * Function called after opening the view
   */
  cbFn?: (options: RenderViewOptions) => void;

  /**
   * Function called just before capturing the screenshot
   */
  beforeScrnCbFn?: (options: RenderViewOptions) => void;

  /**
   * The dimensions of the screenshot
   */
  dimensions?: RenderDimensions;

  /**
   * Source identifier for the screenshot
   */
  source?: string;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Regular expression to wait for in response URLs
   */
  waitForRegex?: RegExp;

  /**
   * Whether to wait for regex after callback function
   */
  waitForRegexAfterCbfn?: boolean;
}

/**
 * Image data returned after rendering
 */
export interface ImageData {
  /**
   * The image buffer
   */
  image: Buffer;

  /**
   * The path where the image was saved
   */
  path: string;
}

/**
 * Function to render views as images
 * @param options - options required for rendering
 * @param cb - callback function called with the error value or the image data
 * @return void
 */
export function renderView(
  options: RenderViewOptions,
  cb: (error: Error | null, imageData?: ImageData) => void
): void;
