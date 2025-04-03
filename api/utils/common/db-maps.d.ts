/**
 * Module for database mapping constants
 * @module api/utils/common/db-maps
 */

declare module "api/utils/common/db-maps" {
  /**
   * Mapping some common property names from longer understandable to shorter representation stored in database
   * @type {object}
   */
  export const dbMap: {
    events: string;
    total: string;
    new: string;
    unique: string;
    duration: string;
    durations: string;
    frequency: string;
    loyalty: string;
    sum: string;
    dur: string;
    count: string;
  };

  /**
   * Mapping some common user property names from longer understandable to shorter representation stored in database
   * @type {object}
   */
  export const dbUserMap: {
    device_id: string;
    user_id: string;
    first_seen: string;
    last_seen: string;
    last_payment: string;
    session_duration: string;
    total_session_duration: string;
    session_count: string;
    device: string;
    device_type: string;
    manufacturer: string;
    carrier: string;
    city: string;
    region: string;
    country_code: string;
    platform: string;
    platform_version: string;
    app_version: string;
    last_begin_session_timestamp: string;
    last_end_session_timestamp: string;
    has_ongoing_session: string;
    previous_events: string;
    resolution: string;
    has_hinge: string;
  };

  /**
   * Mapping for unique identifiers
   * @type {object}
   */
  export const dbUniqueMap: {
    "*": string[];
    users: string[];
  };

  /**
   * Mapping some common event property names from longer understandable to shorter representation stored in database
   * @type {object}
   */
  export const dbEventMap: {
    user_properties: string;
    timestamp: string;
    segmentations: string;
    count: string;
    sum: string;
    duration: string;
    previous_events: string;
  };

  /**
   * Operating syste/platform mappings from what can be passed in metrics to shorter representations
   * stored in db as prefix to OS segmented values
   * @type {object}
   */
  export const os_mapping: {
    webos: string;
    brew: string;
    unknown: string;
    undefined: string;
    tvos: string;
    "apple tv": string;
    watchos: string;
    "unity editor": string;
    qnx: string;
    "os/2": string;
    "amazon fire tv": string;
    amazon: string;
    web: string;
    windows: string;
    "open bsd": string;
    searchbot: string;
    "sun os": string;
    solaris: string;
    beos: string;
    "mac osx": string;
    macos: string;
    mac: string;
    osx: string;
    linux: string;
    unix: string;
    ios: string;
    android: string;
    blackberry: string;
    "windows phone": string;
    wp: string;
    roku: string;
    symbian: string;
    chrome: string;
    debian: string;
    nokia: string;
    firefox: string;
    tizen: string;
    arch: string;
  };

  /**
   * Whole base64 alphabet for fetching splitted documents
   * @type {object}
   */
  export const base64: string[];
}
