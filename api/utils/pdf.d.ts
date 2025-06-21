/**
 * Module for pdf export
 * @module api/utils/pdf
 */

import { Logger } from "./log";
import * as puppeteer from "puppeteer";

/**
 * PDF generation options for Puppeteer
 */
export interface PDFOptions {
  /**
   * Scale of the webpage rendering. Defaults to 1. Scale amount must be between 0.1 and 2.
   */
  scale?: number;
  /**
   * Display header and footer. Defaults to false.
   */
  displayHeaderFooter?: boolean;
  /**
   * HTML template for the print header. Should be valid HTML markup with following classes used to inject printing values into them:
   * - date: formatted print date
   * - title: document title
   * - url: document location
   * - pageNumber: current page number
   * - totalPages: total pages in the document
   */
  headerTemplate?: string;
  /**
   * HTML template for the print footer. Should use the same format as the headerTemplate.
   */
  footerTemplate?: string;
  /**
   * Print background graphics. Defaults to false.
   */
  printBackground?: boolean;
  /**
   * Paper orientation. Defaults to false.
   */
  landscape?: boolean;
  /**
   * Paper ranges to print, e.g., '1-5, 8, 11-13'. Defaults to the empty string, which means print all pages.
   */
  pageRanges?: string;
  /**
   * Paper format. If set, takes priority over width or height options. Defaults to 'Letter'.
   */
  format?:
    | "Letter"
    | "Legal"
    | "Tabloid"
    | "Ledger"
    | "A0"
    | "A1"
    | "A2"
    | "A3"
    | "A4"
    | "A5"
    | "A6";
  /**
   * Paper width, accepts values labeled with units.
   */
  width?: string | number;
  /**
   * Paper height, accepts values labeled with units.
   */
  height?: string | number;
  /**
   * Paper margins, defaults to none.
   */
  margin?: {
    /**
     * Top margin, accepts values labeled with units.
     */
    top?: string | number;
    /**
     * Right margin, accepts values labeled with units.
     */
    right?: string | number;
    /**
     * Bottom margin, accepts values labeled with units.
     */
    bottom?: string | number;
    /**
     * Left margin, accepts values labeled with units.
     */
    left?: string | number;
  };
  /**
   * Paper ranges to print, e.g., '1-5, 8, 11-13'. Defaults to the empty string, which means print all pages.
   */
  preferCSSPageSize?: boolean;
  /**
   * Give any CSS @page size declared in the page priority over what is declared in width and height or format options.
   * Defaults to false, which will scale the content to fit the paper size.
   */
  path?: string;
}

/**
 * Function to generate pdf from html
 * @param html - html text to be converted to html
 * @param callback - callback function after pdf is generated
 * @param options - pdf options, default null
 * @param puppeteerArgs - pupeteer arguments, default null
 * @param remoteContent - if it is set base64 string of html content buffer is set as pdf content, default true
 */
export function renderPDF(
  html: string,
  callback: (buffer: Buffer) => void,
  options?: PDFOptions | null,
  puppeteerArgs?: puppeteer.LaunchOptions | null,
  remoteContent?: boolean
): Promise<void>;
