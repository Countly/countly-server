/**
 * Module for server side localization. Uses minimized localization files at frontend/express/public/localization/min/
 * @interface Locale
 */
export interface Locale {
  /**
   * Replaces placeholders in localized string with provided values
   * @param {string} value - localized value with placeholders to be replaced
   * @param {...*} var_args - other arguments to be inserted in localized string's placeholder places {}
   * @returns {string} localized string with placeholders replaced by provided var_args values
   * @example
   * localize.getProperties(member.lang, function(err, properties){
   *     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
   *     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
   * });
   */
  format(value: string, ...args: any[]): string;

  /**
   * Fetches single localized string by property name for provided language
   * @param {string} lang - 2 symbol code for localization file to be fetched, for example, "en"
   * @param {string} name - name of the localized property to fetch
   * @param {(err: Error | null, localizedValue: string) => void} callback - function to be called when localized property files was fetched
   * @example
   * localize.getProperty(member.lang, "mail.new-member-subject", function(err, subject){
   *     mail.sendMessage(member.email, subject);
   * });
   */
  getProperty(lang: string, name: string, callback: (err: Error | null, localizedValue: string) => void): void;

  /**
   * Fetches whole localized object with property names as key and localized strings as values for provided language
   * @param {string} lang - 2 symbol code for localization file to be fetched, for example, "en"
   * @param {(err: Error | null, properties: Record<string, string>) => void} callback - function to be called when localized property files was fetched
   * @example
   * localize.getProperties(member.lang, function(err, properties){
   *     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
   *     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
   * });
   */
  getProperties(lang: string, callback: (err: Error | null, properties: Record<string, string>) => void): void;
}

export default Locale;