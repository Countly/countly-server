/**
 * Timezone information for a specific timezone in a country
 */
export interface TimezoneInfo {
  /**
   * Object with a single key-value pair where the key is the timezone display name (e.g., "(GMT+01:00) Andorra")
   * and the value is the timezone identifier (e.g., "Europe/Andorra")
   */
  [displayName: string]: string;
}

/**
 * Country timezone information
 */
export interface CountryTimezoneInfo {
  /**
   * Country name
   */
  n: string;

  /**
   * Array of timezone information for the country
   */
  z: TimezoneInfo[];
}

/**
 * Object containing timezone data organized by country code
 */
export interface TimeZones {
  /**
   * Country code as key (e.g., "US", "GB", "JP") with country timezone information as value
   */
  [countryCode: string]: CountryTimezoneInfo;
}

/**
 * Object containing timezone data organized by country code
 */
export const getTimeZones: TimeZones;

/**
 * Array of valid timezone identifiers (e.g., "Europe/London", "America/New_York")
 */
export const timezoneValidation: string[];
