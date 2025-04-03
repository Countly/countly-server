/**
 * Module for server side localization. Uses minimized localization files at frontend/express/public/localization/min/
 * @module api/utils/localization
 */

import * as fs from "fs";
import * as path from "path";
import { Logger } from "./log";
import * as common from "./common";

/**
 * Properties object containing localized strings
 */
export interface LocalizationProperties {
  [key: string]: string;
}

/**
 * Localization module
 */
interface Locale {
  /**
   * Replaces placeholders in localized string with provided values
   * @param value - localized value with placeholders to be replaced
   * @param var_args - other arguments to be inserted in localized string's placeholder places {}
   * @returns localized string with placeholders replaced by provided var_args values
   * @example
   * localize.getProperties(member.lang, function(err, properties){
   *     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
   *     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
   * });
   */
  format(value: string, ...args: any[]): string;

  /**
   * Replaces placeholders in localized string with provided values (array version)
   * @param value - localized value with placeholders to be replaced
   * @param args - array of arguments to be inserted in localized string's placeholder places {}
   * @returns localized string with placeholders replaced by provided args values
   */
  format(value: string, args: any[]): string;

  /**
   * Fetches single localized string by property name for provided language
   * @param lang - 2 symbol code for localization file to be fetched, for example, "en"
   * @param name - name of the localized property to fetch
   * @param callback - function to be called when localized property files was fetched, receiving first param as error and second as localized string
   * @example
   * localize.getProperty(member.lang, "mail.new-member-subject", function(err, subject){
   *     mail.sendMessage(member.email, subject);
   * });
   */
  getProperty(
    lang: string,
    name: string,
    callback: (err: Error | null, value: string) => void
  ): void;

  /**
   * Fetches whole localized object with property names as key and localized strings as values for provided language
   * @param lang - 2 symbol code for localization file to be fetched, for example, "en"
   * @param callback - function to be called when localized property files was fetched, receiving first param as error and second as properties object
   * @example
   * localize.getProperties(member.lang, function(err, properties){
   *     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
   *     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
   * });
   */
  getProperties(
    lang: string,
    callback: (err: Error | null, properties: LocalizationProperties) => void
  ): void;
}

/**
 * Localization module instance
 */
declare const locale: Locale;

export = locale;
