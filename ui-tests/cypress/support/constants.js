module.exports.FEEDBACK_TYPES = {
    SURVEYS: 'ias',
    NPS: 'nps',
    RATINGS: 'ratings',
  };
  
  module.exports.RATING_SYMBOLS = {
    EMOJIS: 'Emojis',
    THUMBS: 'Thumbs',
    STARS: 'Stars',
  };
  
  module.exports.FEEDBACK_ADD_STEPS = {
    SETTINGS: 'Settings',
    APPEARANCE: 'Widget appearance',
    DEVICES_TARGETING: 'Devices & Targeting',
  };
  
  module.exports.BEHAVIOUR_TYPES = {
    SESSIONS: 'Sessions',
    EVENTS: 'Events',
    VIEW: 'View',
    FEEDBACK: 'Feedback',
    CRASH: 'Crash',
    PUSH: 'Push'
  };
  
  module.exports.COMPARISON_OPTIONS = {
    AT_LEAST: 'At least',
    EQUAL_TO: 'Equal to',
    AT_MOST: 'At most',
    IS_BETWEEN: 'is between',
    IS: 'is',
    IS_NOT: 'is not',
    CONTAINS: 'contains',
    DOES_NOT_CONTAIN: 'doesn\'t contain',
    IS_SET: 'is set',
    BEGINS_WITH: 'begins with',
    GREATER_THAN: 'greater than',
    LESS_THAN: 'less than',
    IN_THE_LAST: 'in the last'
  };
  
  module.exports.TIME_PHRASES = {
    IN_BETWEEN: 'In Between',
    BEFORE: 'Before',
    SINCE: 'Since',
    IN_THE_LAST: 'In the Last',
    ALL_TIME: 'All time'
  };
  
  module.exports.TIME_UNITS = {
    DAYS: 'days',
    WEEKS: 'weeks',
    MONTHS: 'months',
    YEARS: 'years',
    HOUR: 'hour',
    DAY: 'day',
    MONTH: 'month',
  };
  
  module.exports.LOGICAL_OPERATORS = {
    AND: 'And',
    OR: 'Or'
  };
  
  module.exports.YES_NO_OPTIONS = {
    YES: 'Yes',
    NO: 'No'
  };
  
  module.exports.APP_TYPE = {
    MOBILE: 'Mobile',
    WEB: 'Web',
    DESKTOP: 'Desktop'
  };
  
  module.exports.DATA_TYPE = {
    BANKING: 'Banking',
    HEALTHCARE: 'Healthcare',
    NAVIGATION: 'Navigation',
    ECOMMERCE: 'eCommerce',
    GAMING: 'Gaming'
  };
  
  module.exports.FEATURE_TYPE = {
    CRASHES: 'Crashes',
    PROFILE_GROUPS: 'Profile Groups',
    DATA_POINTS: 'Data Points',
    EVENTS: 'Events',
    RATING: 'Rating',
    SESSIONS: 'Sessions',
    USERS: 'Users',
    VIEWS: 'Views'
  };
  
  module.exports.EMAIL_NOTIFICATION_TYPE = {
    TO_SPECIFIC_ADDRESS: 'To specific address',
    TO_USERS_IN_A_GROUP: 'To users in a group',
    DO_NOT_SEND_FOR_THIS_ALERT: 'Don\'t send for this alert'
  };
  
  module.exports.TRIGGER_METRICS = {
    //CRASHES
    OF_CRASHES_ERRORS: '# of crashes/errors',
    NON_FATAL_CRASHES_ERRORS_PER_SESSION: 'non-fatal crashes/errors per session',
    FATAL_CRASHES_ERRORS_PER_SESSION: 'fatal crashes/errors per session',
    NEW_CRASH_ERROR: 'new crash/error',
    //PROFILE GROUPS
    OF_USERS_IN_THE_PROFILE_GROUP: '# of users in the profile group',
    //DATA POINTS
    TOTAL_DATA_POINTS: 'total data points',
    //EVENTS
    COUNT: 'count',
    SUM: 'sum',
    DURATION: 'duration',
    AVERAGE_SUM: 'average sum',
    AVERAGE_DURATION: 'average duration',
    //RATING
    OF_RESPONSES: '# of responses',
    NEW_RATING_RESPONSE: 'new rating response',
    //SESSIONS
    AVERAGE_SESSION_DURATION: 'average session duration',
    OF_SESSIONS: '# of sessions',
    //USERS
    OF_USERS: '# of users',
    OF_NEW_USERS: '# of new users',
    //VIEWS
    BOUNCE_RATE: 'bounce rate',
    OF_PAGE_VIEWS: '# of page views',
  };
  
  module.exports.TRIGGER_VARIABLE = {
    INCREASED: 'increased',
    DECREASED: 'decreased',
    MORE: 'more'
  };