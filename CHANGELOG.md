## Version 20.04.1

**Fixes**
* [api] make sure location is string
* [api] skip empty bulk requests
* [cmd] fix logging of upgrade commands
* [configuration] plugin settings in app managament treat number like number
* [crashes] log bulk error on crash users upsert
* [dbviewer] fixed projection problem
* [enterpriseinfo] more space to login area
* [frontend] fix empty template load in application management
* [frontend] fixed admins accessing applications section
* [frontend] fixed error when checking user_of rights
* [frontend] period parsing fixes
* [members] maintain backwards compatability for api key validation
* [plugin-upload] fix file type check
* [populator] allow providing single digit values as custom user properties in templates
* [push] fixing unhandled rejection on delete of notification with invalid id
* [reportmanager] delete long tasks on app delete
* [server-stats] punchcard comply with rights access
* [star-rating] fix dialog to work with checksum enabled apps
* [star-rating] fixed integration popup problem
* [star-ratings] fixed comments tab sorting problem
* [systemlogs] fix exports script for new driver version
* [views] correct localization based on app type
* [views] fixed incorrect result when searching for specific views

**Enterprise fixes**
* [ab-testing] fixed user merging logic for ab testing experiments
* [ab-testing] shallow copy bug fix
* [attribution] correctly calculating campaign level aggregated data
* [cohorts] do not crash if cohort does not exist for widget
* [cohorts] moved back to master process for usage in push campaigns
* [concurrent_users] handling metric labels overflow
* [dashboards] fixed double zoom on drill widget period switch
* [drill] correctly check query type for api parameter
* [drill] fixed date processing error in some cases
* [drill] fixed duration formatting for BY queryes and dashboard widgets
* [drill] fixed recording orientation key
* [drill] limit line count in graph based on settings color count for BY queries
* [drill] proper event key escaping/unescaping processing
* [drill] use BY limit from configuration correctly
* [flows] use view display name in flow diagram
* [formulas] correctly regenerate formulas data in report manager
* [formulas] fixed NaN/no data issue for weekly buckets
* [funnels] fixed calculating funnel data for past periods
* [loyalty] fix segmentation filter
* [performance-monitoring] apm tables sorting fixes
* [performance-monitoring] fix drill query period
* [performance-monitoring] tabs navigation bug fix
* [performance-monitoring] unknown value fix
* [star-rating] drill icon will only appear on ratings tab

**Improvements**
* [compare] increased app/event compare limit to 20
* [db] support for mongodb DNS seed list connection string
* [frontend] add links to events in event overview
* [frontend] remove password field when creating users from Global admin
* [ip_store] store ip address as custom user property (disabled by default)
* [logger] allow searching for request contents in search field
* [logger] register data for tokens on top level
* [logger] register requests with ms precision
* [performance-monitoring] network response latency overall percentages and breakdown by country
* [populator] add more template based views with heatmap data for web app type
* [remote-config] add support for does not contain
* [reportmanager] display errors in the report manager table 

**Enterprise Improvements**
* [block] do not require segmentation for blocking events
* [funnels] display readable stepnames for custom dashboards widgets
* [users] display search input if any value is provided in it
* [users] make segments and segment values searchable and exportable in event timeline

**Development related**
* [api] provide a way to bypass checksum check for programmatic request
* [cmd] add new plugin creation command
* [docker] Invalid A/B testing model location for debian
* [docker] Removing unnecessary plugins
* [docker] fixed disappearing timzeone
* [docs] comment fixes and documentation generation stucture
* [frontend] allow skipping columns from export
* [plugins] ensure events propagate to all plugins on single plugin failure
* [scripts] single mongodb installation script (that can be used standalone)
* [shellcheck] fixes and CI checks
* [tests] increased timeouts and removed ambigiousness


## Version 20.04

**Fixes**
* [2fa] added white labeling to 2fa qr codes
* [2fa] adding 2FA check to password reset
* [2fa] let users retry if they input an incorrect auth code
* [UI] Safari input[type="search"] fixes
* [UI] add google map api key configuration reminder
* [UI] cly-select disabled styling
* [UI] event duration formatted in all places
* [UI] fixed fonts rendering on Windows
* [UI] fixed selectize performance issue
* [UI] fixed single data point not visible
* [UI] hide menu category if no menu items available
* [UI] use arrow keys to handle navigation on dropdowns
* [api] correctly merge array properties for users (not converting them to objects)
* [api] fixed api side aggregated data user correction in some cases
* [api] fixed escaping filenames in headers
* [api] reset period object before getting query time ranges
* [api] respect city settings when it comes to user 
* [core] fixes running countly in sub directory
* [core] improve countly user password change experience
* [crashes] double dots on y axis for crash/session ratio
* [crashes] fix closing first thread on refresh
* [crashes] make sure minidump_stackwalk binary has proper permissions
* [data-migration] correctly export push credentials and import them
* [dbviewer] add link to all links instead of javascript view change
* [dbviewer] aggregation optimization and long tasks
* [dbviewer] making query to none existing database results in 504 timeout
* [export] CSV export injection prevention
* [export] do not convert timestamps to date values
* [export] fix problems with SSL configuration
* [frontend] fixed app version sorting in the table
* [frontend] fixed css for User Loyalty bug
* [frontend] hide numbers before sparklines loaded
* [frontend] more space for event names
* [frontend] properly merge aggregated metrics to fix multiple empty and unknown keys
* [frontend] resetting graph types when graphs change
* [jobs] Fixing job start update being made after finish one
* [push] Fixing multi-select overflow
* [push] Fixing race when 2 jobs compete for 1 resource
* [push] Prevent multiple dashboard requests when refresh is faster than the request itself
* [push] Return validation errors in response
* [push] Validating _id length on certain endpoints
* [push] notification not found error disambiguation
* [push] prevent overflow of app title in create message
* [reportmanager] fixed report completed reminder
* [reports] fixed Incorrect email report colors
* [security] add api key schema checking
* [security] additional sanitiztion for uploaded file names
* [security] command line fixes
* [security] deleting pasword reset requests when changin email in settings
* [security] escaping user provided values in all emails
* [security] global collection access management
* [security] invalidate old sessions after Password Reset
* [security] kill other sessions for same user on logout
* [security] password recovery bruteforce prevention
* [security] prevent injection from localiztion key
* [security] proper setup page validation
* [security] sending activation link instead of password
* [security] stricter decoding rules, disable eval, monitor eval usage
* [security] updated jquery and jquery ui to latest versions
* [slipping-aways] fixed calculating period bug
* [star-rating] design fixes
* [star-rating] fixed deleting widgets on app delete
* [star-rating] removed web oriented settings from other app types from feedback drawer
* [star-rating] sticker z-index fixed
* [star-rating] textarea and email input overflow problem fixed
* [tokens] fixed for not taking token without endpoint restriction
* [tokens] reusing tokens when possible instead of creating multiple tokens
* [topevents] bug fix on some periods app change
* [views] action map should use new way to get URL
* [views] fixed displaying scroll % for dynamic height pages
* [views] fixed issue with incorrect results when searching by views name and sorting by any other column
* [web] updated UA parser recognizing new browsers as IE based on chromium

**Enterprise fixes**
* [UI] added missing localizations
* [ab-testing] hide administration buttons from users
* [attribution] additional checks on form creation
* [attribution] hash collision mitigation
* [attribution] ignore bots for clicks
* [block] convert event segments to proper type before checking
* [cohorts] correct total count based on app_users collection
* [cohorts] fix calculating aggregated users on new year change
* [cohorts] fixed editing cohort reseting user query
* [cohorts] fixed reseting cohorts statuses on restart
* [cohorts] handle refresh action for aggregated data
* [cohorts] move to separate process not to affect data ingestion
* [cohorts] optimize aggregated data output by omiting 0
* [concurrent-users] loadConfig before mail.lookup
* [concurrent_users] ensure TTL and max indexes
* [concurrent_users] removed broken css
* [crash_symbolication] added file type check on api side for symbol upload process
* [crash_symbolication] enter press event link to ajaxSubmit method
* [crash_symbolication] fix error on symbol not found
* [crash_symbolication] fix undefined values in build list
* [crash_symboliction] fix symbolication log type and android native command
* [db] fix $addToSet usage with new MongoDB limitations
* [drill] event context specific indexes
* [drill] fix username typo
* [drill] treat numbers as potential floats
* [drill] use display names for views in drill
* [flows] cache event indices
* [funnels] fixed using cohorts as segmentation in OR steps
* [groups] add systemlogs
* [jobs] fix of rescheduling cohorts
* [remote-config] add systemlogs
* [restrict] restrict access to manage menu
* [restrict] updated API/view corelation
* [revenue] overview widget not refresh on date change
* [users] fixed column selection bugs
* [users] format custom property as date only if it is withing 5 years period from now
* [whitelabel] active menu item doesn't work for bg

**New Features**
* [2fa] encrypt 2fa secrets in db
* [UI] dashed line for unfinished periods in graphs
* [UI] new date picker
* [active_users] displays MAU, WAU, DAU in Users section
* [api] record user's device orientation
* [config] add button to test sending email
* [core] offline mode config for closed network servers
* [crashes] add first crash line to crash name in table
* [crashes] new crash metrics
* [crashes] revised graph UI
* [crashes] support for PL Crash reports
* [dbviewer] can search for collections by hashes too
* [dbviewer] correctly display ObjectId objects in DBViewer
* [dbviewer] display indexes of collections
* [frontend] config for default period selected on dashboard
* [frontend] enable datatable display count by default
* [frontend] sort app versions latest version at the top
* [frontend] zooming controls for graphs
* [populator] allow creating templates for specific event sets and user properties
* [populator] populate feedback data
* [push] Displaying message id in view message
* [push] rate limiting push sending
* [reports] job for clearing old autogenerates reports
* [server-stats] add 3 month period for datapoints
* [server-stats] add punchcard with hourly metrics
* [star-rating] added custom theme support for feedback popup
* [star-rating] allow changing size of the Feedback button
* [star-rating] display tooltips on emojis
* [systemlogs] display id of document changed on first level
* [tokens] job for clearing old unused tokens
* [views] allow changing display name for views

**New Enterprise Features**
* [UI] change URL on applied query in all views
* [block] allow new operators as contains in filtering rules
* [cohorts] new UI with overview and user metrics
* [cohorts] new bars dashboard widget
* [cohorts] support for OR steps
* [crash_symbolication] UI for missing symbols
* [crash_symbolication] add PL crash support
* [crash_symbolication] add load address to binary symbols table
* [drill] add doesn't contain operator
* [drill] config to disable recording big lists
* [drill] preaggregated reports for slower queries
* [drill] reverse big list searching
* [drill] updated UI for query creation first
* [flows] add report manger support for slow queries
* [flows] apply event exclusion run time
* [formulas] add cohorts user numbers
* [formulas] add session duration to formulas
* [formulas] add widget number for custom dashboards
* [funnels] new UI with overview
* [funnels] parallel step processing for faster responses
* [funnels] show time spent between steps
* [funnels] support for OR steps
* [performance-monitoring] new plugin to monitor traces in the app
* [slipping-away] allow segmenting Slipping away users for EE
* [star-rating] added to drill and cohorts/funnels steps
* [users] display more mtea info on user profile page
* [users] recording and displaying nested objects

**Development related**
* [UI] create global solution in CountlyHelper for creating and managing drawers
* [api] added local module to resolve relative path from Countly root path
* [api] more events for db operations and indexes
* [api] use promise all settled for plugin events
* [cmd] allow calling nodejs scripts directly as commands (without shell wrapper)
* [cmd] command line for systemlogs export
* [config] Allowing specifying external overrides for configextender
* [config] improved nginx SSL settings
* [config] move Allow origin header to config
* [core] allow simple SMTP mailer to be set from config
* [core] allow universal env variable to configure both api & frontend
* [core] make app creation 1 step process
* [core] no need to load js files in javascript directory anymore, they are loaded automatically
* [core] update for moment construtor warning
* [db] add log rotation to mongodb in default installation script
* [db] remove unique constraint on collections that might need sharding
* [db] removed unused drill index
* [dep] nodejs version 10
* [drill] get rid of old meta method
* [drill] move extend drill view to separate file, to make drill.view.js more readable
* [drill] record last session id
* [frontend] added category menu management methods
* [frontend] common template loader
* [frontend] i18n do not download properties for locale en, as it is default locale
* [frontend] log renderCommon failure
* [frontend] updated os mapping
* [jobs] cancel all jobs with “schedule” on replace instead of nearest ones
* [logger] have separate phase for processing after /sdk finished
* [package] move fs-extra to core packages
* [package] move grunt and other required libs to dependencies
* [render] close headless browser incase of errors
* [rights] manage collection access globally in rights module
* [scripts] shellcheck for scripts
* [scripts] update openssl to latest
* [taskmanager] fallback to gridfs for storing larger data sets
* [taskmanager] support for sub tasks
* [vagrant] use 8080 port
* [version] mark separately db and fs versions and mark them on upgrades and installs

## Version 19.08.1

**Fixes**
* [EChartMap] refactor library loading
* [EchartMap] fixed date change refresh bug
* [api] fixed i/tasks/name - calling correct function
* [api] fixed total user correction for server side models
* [api] increase user count in aggregated data for country when country changes
* [crashes] fixed crash menu arrow
* [crashes] update minidump
* [events] fixed getting undefined _activeEvent in some situations
* [events] fixed issue with hiding/showing event whan there is '.' in event name
* [events] fixed issue with matching events in frontend if their keys have special symbols like "&" in them
* [frontend] changed duration display format
* [frontend] fixed check for admin apps (some sections that should be shown to admin, where not visible)
* [frontend] fixed chrome autofill prevention
* [frontend] fixed countries screen color problem
* [frontend] fixed keeping filtered events after changing segments
* [frontend] fixed localization for visits in top
* [frontend] fixed total user correction in 0 cases
* [frontend] fixed unknown country check
* [frontend] fixed uploading app icon on first app screen
* [frontend] fixes for 0 values having colors on the map
* [frontend] improved Internet Explorer 11 support
* [logger] let large texts scroll in table cell
* [prelogin] fixed issue with showing messages in forgot page
* [push] GCM Deprecation
* [push] included in data migration
* [push] show only for mobile type
* [scripts] fixed db upgrade script running as separate script
* [sdk] updated bundled Web SDK
* [views] view deletion added in systemlogs

**Enterprise fixes**
* [attribution] prevent user from creating campaign ID with " or '
* [cohorts] cohort drawer ui bugs fixed
* [concurrent_users] fixed alerts table
* [crash_symbols] order the symbols when fetching to always use last symbol if multiple same symbols provided
* [crashes-jira] fixed check for correct crashes view
* [dashboards] fixed user estimation correction in custom dashboards
* [drill] fixed country map bugs
* [drill] fixed punchcard value formatting
* [funnels] fixed delete multiple rows bug
* [funnels] fixed dragging steps only by drag handler
* [restrict] css fix for hiding menus
* [users] also validate funnel step segmentation
* [users] fix custom column selection bugs

**Enterprise Improvements**
* [cohorts] added configuration to control minimal cohort regeneration time
* [concurrent_users] added legacy live plugin endpoint support
* [drill] return undefined values too in BY queries
* [users] added cursor pointer on view message button
* [users] updated to use long name and value transformations for custom selected fields

## Version 19.08

**Fixes**
* [api] fixed error on deleting user with exported data
* [api] improved tops speed with aggregation pipeline
* [app_versions] fixing displaying empty state
* [assistant] handling case, when document could not be read
* [browser] correctly convert metric to collection for correct data
* [configs] display correct values in app configuration after save
* [events] fixed event overview incorrectly formats duration
* [frontend] added configuration element for google maps api key
* [frontend] correct event total calculation for segmented view of aggregated data
* [frontend] fixed Drop throws error when datatable is empty
* [frontend] fixed japanese locale dates
* [frontend] fixed refreshing total user correction for today
* [frontend] reduced session extend calls.
* [loyalty] fix table ordering
* [push] Correct system log on push credentials update error
* [push] Fixing populator creating messages for wrong app
* [slipping-away] fix fetch user list bug
* [source] fixed localization key in configs
* [star-rating] lots of bug and ui fixes
* [ui] Fixing expand row icon switches on refresh
* [ui] changed email reports % colors.
* [ui] disabling annoying chrome autocomplete
* [ui] fix bug with Ubuntu font on Windows
* [ui] prevent double scrolling
* [ui] set app title attribute when switching apps
* [ui] users and new users country sorting problem resolved
* [views] fixes with tokens expiring when viewing heatmaps

**Enterprise fixes**
* [attribution] encode link if it is not a custom scheme
* [attribution] fixed using last campaign urls when creating new campaign
* [block] fixed creating empty users for new blocked users
* [cohorts] fixed editing cohorts with big lists
* [cohorts] handle empy user sets correctly and more efficiently
* [dashboards] block all popups for dashboard image rendering in emails
* [dashboards] fixed sending email reports if creator is deleted
* [dashboards] improve screenshot rendering speed with cache for emails
* [drill] actions button avaialble without query
* [drill] better bucket and value selection for report manager data
* [drill] big list values are not selected when replaying query bugfix
* [drill] cohorts querying fixes
* [drill] correct user count for multi BY queries
* [drill] fixed generating month ticks for more than 1 year
* [drill] query performance improved with new indexes
* [flows] fix flows logic bug about app data clearing
* [flows] fix views event logic bug
* [funnels] allow to create funnels without events but with views
* [funnels] fixed editing funnels with grouping elements
* [funnels] top percentage update bug fixed
* [groups] add uppercase to allowed characters for name and group id
* [revenue] fix updating overview widget on period changes
* [whitelabeling] replacement of word Countly with company name in all localized strings

**New Features**
* [api] allow updating multiple app users
* [applications] application lock mechanism
* [authorization] tokens now support url parameters as limits
* [crashes] multi thread error support
* [crashes] new crash stack processing for android and javascript
* [crashes] new dropdown menu UI in crash groups
* [dbviewer] added custom field support to dbviewer sort
* [events] display top events for event overview
* [frontend] option to delete your own account
* [plugins] asynchronously check plugin enabling/disabling procedure
* [push] Adding push events to user’s timeline
* [push] allow building target audience just before scheduled date
* [push] option to view recipients of a push
* [push] proxy authentication support
* [push] real-time event triggered push notifications
* [report-manager] smarter more often regenerating automatic reports
* [security] added password secret salt support in configuration file
* [slipping-away-users] add flexible periods setting support
* [two-factor-auth] enable two factor authentication through Microsoft or Google authenticator apps
* [ui] added native tab behaivor to cly-select element
* [ui] allow uploading dashboard profile pictures
* [ui] customize graph colors through config file
* [ui] moved some management tools to top menu
* [ui] new graph note system
* [ui] new menu design
* [ui] new prelogin page design
* [views] select columns to display functionality

**New Enterprise Features**
* [ab-testing] new plugin to perform AB testing
* [attribution] allow providing custom domain for campaign links
* [attribution] allow reattribution
* [concurrent_users] new and more performant and detailed version of live plugin
* [crash_symbolication] support for native crashes and symbolication
* [crashes-jira] plugin to tie caught crashes with JIRA issues
* [drill] make Drill configuration on app level
* [formulas] new plugin to perform arithmetical computations on selected metrics
* [funnels] allow sorting steps by drag and drop when editing funnels
* [geo] Allowing float as geo radius
* [users] added region support
* [users] select columns to display functionality

**Development related**
* [api] moved account deletion to backend api.
* [api] provide cancel request on app not exists
* [api] refactored getPeriodObj
* [cmd] added new upgrade subcommands for automatic multiple version upgrades
* [cmd] script to upgrade countly to ee
* [cmd] use password prompt to mask sensitive data
* [common] add email for validation
* [configs] improved config parsing and usage
* [configs] more session and cookie settings in config file
* [core] Increasing default heap size to 2Gb for API
* [crashes] make crash identification model independent
* [db] log incorrect Object ID to info level
* [example] AWS SES - Simple Email Service example
* [example] nginx example config of blocking access outside intranet
* [frontend] redirect rather than render on POST processing
* [frontend] replaced old google library loader with new version
* [frontend] set cookie only when theme is customizable on user level
* [frontend] trust estimation correction more than new users data
* [members] moved all member functions to single separate members utility
* [scripts] allow countly user to enable plugins
* [scripts] correctly backup nginx config on ubuntu
* [scripts] update_translation.js perfs and reliability boost
* [security] HTML escaping in all localized strings
* [security] remove flash cross domain policy
* [taskmanager] no need to decode html (breaks json parsing)
* [tests] additional way to parse CSRF from body in case of minified html
* [ui] new menu management system
* [ui] updated font awesome lib

## Version 19.02.1

**Fixes**
* [alerts] fixed compare value bug
* [assistant] fixed callback in case of failure to fetch rss feed
* [crashes] additional checks for database failures
* [data] fixed none tracking mode
* [frontend] allow to use device_list on server side too
* [frontend] fixed missing texts for formatSecond
* [frontend] handle logout GET with redirect just in case
* [push] fixed credentials setting validation
* [star-rating] created separate filter popup for comments and ratings tab
* [star-rating] trigger_button_text field problem solved

**Enterprise fixes**
* [attribution] do the regex check on click matching instead of direct match
* [attribution] fixed encoding redirect url
* [cohorts] fixed period check
* [crash_symbolication] fixed api checks and texts
* [drill] fixed BY query for array properties
* [drill] fixed jumping order of BY properties
* [remote-config] correctly check for parameter length
* [remote-config] fixed for boolean values
* [users] correctly check for number type when displaying user properties

**New Features**
* [frontend] add css class to #content based on route name
* [frontend] add css class to body based on selected language
* [populator] mark users generated with populator by custom property

**Development related**
* [ide] added a project editorconfig file
* [log] do not log failed CSRF checks
* [sdk] updated web and nodejs sdks

## Version 19.02

**Fixes**
* [alerts] change crash checking to once per hour
* [api] limit loading meta data for events with high cardinality in segments
* [api] make sure session duration increments are always numbers
* [api] parse events only if needed
* [api] properly delete app images on app delete
* [api] record session frequency by sessions, not users
* [compare] fixed bug with returning result
* [compare] fixed missing icons
* [compliance-hub] ui table trim longer device_ids
* [config] fixed config extender not working with underscore or camelcase properties
* [crashes] do not format app version
* [crashes] do not return list if there are too many crashes
* [crashes] fixed hidden comments
* [crashes] properly refresh stacktrace with markup
* [dashboard] fixed changing password
* [dashboard] fixed sorting in some serverside tables
* [dashboard] make age of unauthorized sessions much shorter
* [dashboard] move app versions legend to the bottom
* [data-migration] fixed click menus disappearing
* [db] correctly replace database name
* [db] fixed overriding poolsize in some cases
* [frontend] fix when isoweek falls for the year in which it has thursday
* [frontend] parse values as number when calculating percentage change
* [frontend] server svg files with correct encoding
* [monetization] crash bug when year is selected
* [overview] fixed geo chart when date change
* [push] respect restricted access rules
* [reports] UI and table sorting fixes
* [reports] allow manual data refresh for auto refresh tasks
* [reports] allow rerunning tasks on http redirect settings
* [reports] fix reports hour logic bug
* [reports] removed the date picker from report manager
* [screenshots] fixed ssl issue resolving
* [security] add global $ handler in keys
* [security] escape html in popups
* [security] more proper error handling to prevent unwanted states
* [server-stats] fix event count calculation
* [slipping-away-users] use time of last api call instead of last session
* [star-rating] fixed timestamp
* [systemlogs] change comparison was recording too much
* [systemlogs] exprot file name fix
* [ui] correct flag sizes
* [web] fixed error in pixel tracking passing user agent and added tests

**Enterprise fixes**
* [attribution] optimizations for large click amount
* [attribution] proper back behavior
* [dashboards] fixed email subjects
* [dashboards] remove current users from the edit view permission list
* [dashboards] users list fix
* [drill] Bug switching to hourly format on 7days
* [drill] allow disabling meta recording
* [drill] get correct user count in BY queries
* [drill] handling paralel view duration updates
* [flows] update for query performance
* [funnels] fixed using correct minimal ts for each step
* [groups] fixed output closed and null issues
* [groups] fixed section restriction not showing in some cases
* [heatmaps] are now not tied to view name (can use custom view names)
* [push] Drill loading fix for no users case
* [revenue] fixed loading data in app configuration

**New Features**
* [alert] allow sharing with multiple email addresses
* [api] Allow to delete multiple app users with force flag
* [api] add region from geoip lite module
* [api] added ability to upload app icon via API
* [api] allow pausing receiving app data
* [dashboard] bruteforce 0 attempts disabled bruteforce protection
* [dashboard] change /logout api method from GET to POST
* [dashboard] move to auth tokens
* [dashboard] send link to authenticate user on different cases (time ban, password change)
* [dashboard] use POST in most cases instead of GET
* [dashboard] use argon2 for password hashing
* [data-points] show data for larger periods
* [dbviewer] add countly_fs and countly_out to list of databases too
* [dbviewer] aggregation support
* [dbviewer] reload data instead of whole view
* [feedback] added systemlogs for widget create, edit and remove processes
* [frontend] add rate limiting and configuration for it
* [frontend] added more configuration options to version.info file
* [frontend] allow controling language list from specific config file
* [logger] log all canceled requests too
* [loyalty] new loyalty view
* [overview] faster top bar loading when it is high cardinality segment
* [populator] add utm data generation
* [push] ability to edit a automated push notification
* [push] clear credentials on app reset
* [push] close emoticon dialog on ESC key
* [push] email notifications on push auto message fails
* [push] new alert dialogs for errors
* [push] proxy support
* [remote-config] allow remote configuration for apps with SDK
* [security] configurable session secret
* [sources] add source character limitation configuration
* [ui] added dropdown icons
* [ui] first app creation dialog
* [views] add column configuration
* [views] added page scroll percentage numbers (avg)
* [views] allow deleting views
* [views] performance improvements for handling more views
* [views] select which fields to show in table


**New Enterprise Features**
* [block] allow blocking internal events
* [cohorts] allow segmenting user properties separately
* [cohorts] allow to use location in user property query
* [crashes] add crash name as drill segment
* [dashboards] added systemlogs for dashboard and widget create, edit and remove
* [dashboards] cohort widget
* [drill] allow contains search on fields
* [drill] drill data based estimation correct for users in overview and other sections (including previous period)
* [drill] multiple by fields are allowed
* [drill] new ui for querying
* [drill][flows][funnels] do not cache if amount of data is low
* [funnels] option for funnel start all users or entered users
* [funnels] separate each step segmentation
* [heatmaps] additional resolution options added
* [retention_segments] Addd event based retention data
* [users] column configuration for users table
* [users] display notes about users on hover in the table

**Development related**
* [api] add event for plugins to convert metric to collection data
* [api] added api to return internal-events
* [api] changed api key generation logic
* [api] correct error states for APIcallback
* [api] more multi purpose top fetching
* [api] multiple metric refactoring and fixes
* [api] respong only after app check
* [cmd] healthcheck additions and fixes
* [common] fixed countlyCommon.formatSecond() method
* [db] adding country metric index for faster overview load
* [db] ignore handled errors like duplicate index inserts
* [db] implement basic collection cache
* [db] improved logging
* [db] properly log arguments
* [db] provide a way to load database specific configs based on database name
* [db] update compatability layer due to driver changes
* [db] use count instead of aggregation for total users
* [db] use estimated count when possible
* [eslint] single config file and fixes
* [frontend] add common.db reference for consistency with api process
* [frontend] add constraints to unique fields like email
* [frontend] add countlyCommon.getPeriodRange function
* [frontend] fixed regex for page/refresh scripts
* [groups] added group id for groups.
* [nginx] increase worker file and connection limits
* [nginx] provide https template
* [package] remove bad dependencies
* [package] remove kerberos support
* [populator] add crash name property
* [ui] allow cly dropdown to open up instead of down too
* [upgrade] backup configs properly
* [vagrant] modified Vagrantfile to provision development VM with 2048 MB memory

## Version 18.08.2

**Fixes**

* [api] added support for ports and brackets in ip addresses
* [api] added support for partial ip address as masks in ignoreProxy config
* [api] check correctly for finished none http requests
* [api] deeper escaping of objects
* [api] fixes for handling unparsable period
* [api] more error checks and handling
* [api] regular expression checks
* [appmanagement] load configuration on new app(on new server)
* [config] fixes for relative path changes
* [crashes] fix escaping in crash error and stacktrace
* [crashes] improve search index
* [crashes] improved type check
* [data-migration] log redirect url in logger
* [db]fixed replacement of db name in mongodb connection string
* [events] updated compare_arrays function for events to have more checks if both passed are arrays
* [feedback] device_id fix and script for correcting data
* [frontend] correctly genersate ticks for month buckets
* [frontend] fix not using data on init for today period
* [frontend] fix title if not available
* [install] fix permission issue
* [logger] improve info column formatting
* [nginx] remove server flag
* [populator] fixed campaign session issue for web apps in populator
* [push] Deny APN app settings update if no file is selected
* [push] Fix for race condition in message status updates
* [push] Fix for upload of APN credentials from windows / no mime-aware systems
* [security] more cross site scripting preventions
* [slipping-away-users] fix style issue
* [systemlogs] fixed system logs plugin table sorting issue
* [ui] drop down fix
* [ui] fixed "Email value too long" issue.


**Enterprise fixes**

* [drill] correctly check projection key result type
* [drill] fix filter render bug
* [drill] fix switching bucket UI
* [push] Approver update
* [recaptcha] scroll fix on login screen
* [revenue] use user estimation correction

**New Features**
* [api] support for multiple errors message
* [server-stats] display datapoints for admins and users too

**New Enterprise Features**
* [dashboard] disabling sharing dashboards
* [drill] added no_map param to display plain country data

## Version 18.08.1

**Fixes**

* [assistant] fixed browser side error with a empty server
* [config] switch buttons resized
* [core] fixed bug when admin can't edit apps in some cases
* [docker] added countly-core docker image without mongodb
* [docker] improved environment variable based configuration
* [enterprise] make sure drill library loads before cohorts and funnels
* [events] fixed padding on selectize items(omit segment)
* [jsdoc] updated doc template
* [plugins] use POST app config update instead of GET
* [push] UI fixes
* [push] fixed for p12 credentials upload resulting in unknown error
* [push] improved geolocations support
* [sdk] install udpated version of web sdk
* [upgrade] improved checks in mongodb upgrade scripts

## Version 18.08

**Fixes**

* [api] fixed some metrics double prefixing on request restarts
* [api] handle concurrent user creations
* [api] handle some edge cases and log instead of crashing
* [api] more fixes to post user merging
* [assistant] fixed issue with assistant button that was appearing with delay
* [configuration] session_timeout is now in minutes and not mili seconds
* [data_migration] fixes and improvements to ui and process
* [db] process connection string for replica sets in singleDefaultConnect method
* [dbviewer] fix viewing documents with / in the _id field
* [device_list] properly decode some values
* [core] fixed exports for server side tables
* [core] log user out only on updated password
* [core] sort engagement graphs by bucket not by amount
* [crashes] adding indexes for server side table performance
* [crashes] fixed public crash page bugs
* [crashes] fixed user merge bug
* [errorlogs] made errorlogs 360.14 times faster
* [events] fixed issue with not refreshing in overview and editing events
* [logger] do not decode HTML (prevent injection)
* [plugin-upload] try to apply recovery only once
* [push] Improved message queue
* [push] Missing tzs fix
* [reports] fixed email input field
* [security] force password complexity settings on password reset
* [security] prevent XSS on some input fields
* [ui] added message for expired CSRF tokens: Your session was expired. Please login again
* [ui] fixed active tab styles
* [ui] fixed export dialog on iPad and Chrome
* [ui] fixed scrolling on submenus
* [ui] show scroll bar on scrollable content
* [ui] trend indicator for positive/negative trends in context
* [web] show unknown flag

**New Features**

* [api] reload config periodically (instead of on each request)
* [apps] new ui for app configurations
* [apps] allow overwriting some global server configurations on app level
* [configuration] added enabling/disabling metric changes setting to configs
* [configuration] added functionality to provide dashboard user level settings to allow changing theme
* [core] added dashboard authorization with tokens
* [core] medium independent request processor (can pass request data in any way and protocol wanted)
* [crashes] added new tab in crashes overview page: crashes per session
* [data-migration] added endpoint to allow import on previously uploaded file
* [device_list] update devices and add amazon devices
* [dbviewer] added collection search
* [dbviewer] easier browsable single documents
* [dbviewer] new query ui design
* [dbviewer] switch between apps dropdown, to display information for single specific app
* [EChartMap] add EChartMap for Country view replacement for servers without Google services
* [examples] added tcp server example to demonstrate custom data processing
* [ratings] new functionality through multiple widgets and providing feedback
* [frontend] added year to ticks that span across multiple years
* [frontend] duplicate API request cancelation from dashboard
* [frontend] request cancelation on view and app switches
* [logger] added event log collection capped status and warning
* [logger] check and validate required crash parameters
* [logger] show request received and request time in different columns
* [logger] do not refresh table if row is opened
* [mail] send warning/information on timeban via email
* [management] added new section for plugin app configurations
* [management] show if user has time ban and allow removing it
* [onboarding] plugin showing of new features
* [populator] heatmap & scrollmap / feedback data generation support
* [reportmanager] added manual and auto updated reports
* [reportmanager] added private and global reports
* [reports] allow other plugins to add more reports
* [server-stats] allow look n month back via api
* [server] remove server version info from nginx
* [slipping-away] update table style
* [tokens] added api option to limit tokens to specific endpoints
* [tokens] added token managament UI for user menu
* [ui] add visual cue for expandable rows
* [ui] added external links for tables where rows open new views
* [ui] adjust event name length
* [ui] auto expand left navigation (in events, apps, funnels etc.)
* [ui] new confirmation popups with more information
* [ui] new design for App Details popup
* [ui] new overview bar design
* [ui] smarter behavior for back buttons

**Enterprise Edition fixes**

* [attribution] improvements to postback redirection
* [attribution] optimized campaign view with server side pagination, by showing all data for all periods in campaign tables
* [cohorts] handle removed events and properties correctly
* [drill] do not automatically convert event segments and custom user properties to big lists
* [drill] fix data table export bug
* [drill] fix reapplying query with big list values that are not in initial list
* [drill] fix displaying user list when cohorts are in query
* [funnels] added API average time between steps
* [funnels] fixes on total user calculation
* [funnels] improved unordered event processing
* [funnels] fixed text cutoff problem for funnels
* [push] showing dropdown for push on single user profiles
* [revenue] added to new events table design to select/unselect IAP events
* [white-labeling] showing default color(hex) as placeholder

**Enterprise Edition features**

* [attribution] support the same behavior for desktop as mobile
* [block] change ui to new drawer
* [crash_symbolication] adding reminder for missing mapping files.
* [crash-symbolication] improved empty symbol table styling
* [crash_symbolication] updated table indicator by taking into account which platforms are used in the current app
* [dashboards] added more widget types for retention, views, times of day, etc
* [dashboards] allow plugins adding more widgets
* [dashboards] create screenshots of dashboard for email reports
* [drill] API support multiple projection keys
* [drill] BY query result pagination
* [drill] allow to save results in report manager
* [drill] new actions menu in drill
* [flows] added view support for flows
* [flows] update different no data messages for Events & Views
* [funnels] multi step segmentation support
* [retention_segments] improved retention UI
* [retention_segments] providing multiple retention types: Full, Classical, Unbounded
* [users] added filter for Events timeline
* [users] added labels for Events timeline
* [users] correct segment name description in Events timeline
* [users] custom properties handle timestamps as date, including future ones
* [users] display duration for each funnel step

**Development related**

* [api] /i events now waits on promise resolvement
* [api] allow omitting segments of internal events
* [api] log traces on unhandled errors
* [cmd] basic health check
* [common] autoscale y axis graph ticks
* [common] handle seperate periods in browser
* [components] added vue.js for common subview components
* [core] Countly version checks and markings for future upgrades
* [core] make indexing in background
* [frontend] added safeDivision to countlyCommon
* [frontend] extend ago function to 30 days and handle future timestamps
* [frontend] provide method to change path hash without affecting history
* [mongodb] support for MongoDB 3.6 with new nodejs driver 3.0+
* [nodejs] support for nodejs version 8+
* [scripts] check ram before running installer
* [version] record version/upgrade history

## Version 18.04.1

**New Features**

* [alerts] new plugin for receiving email alerts based on metric changes you configure
* [compliance-hub] adding date selector to tables
* [logger] add change device_id request types
* [security] added config.js option for secure cookies
* [security] set security headers for all requests (including assets)
* [video-intelligence-monetization] new plugin allowing to integrate monetization

**Fixes**

* [api] do not update last api call timestamp on consent/location updates
* [api] recording user merge history and postprocessing missed events in job
* [assistant] added protection for initializing assistant on empty servers
* [assistant] fixed issue with showing wrong URL for github feed items
* [dbviewer] fix for displaying event collections to user read access level
* [compliance-hub] fix big number columns
* [compliance-hub] fixes for searching device_id in consent history
* [frontend] fixed event resetting when switching between events
* [frontend] fixed some missing images
* [frontend] ipad, chrome table export countly drop bug fixed
* [logger] do not log retried requests
* [plugin-upload] fixed plugin validation failing in some cases
* [push] fixed binary building for Ubuntu 17.10
* [push] removing concurrency limit
* [reportmanager] fixing date selector
* [scripts] fixed installation script for Ubuntu 18.04
* [security] disable powered-by headers
* [security] prevent XSS on username/email input
* [security] remove allow any origin policy for flash/action script
* [security] use our own bundle of express expose, to prevent script injection
* [systemlogs] fixing date selector
* [views] handling view duration rounding

**Enterprise Edition fixes**

* [cohorts] optimize user grouping stage
* [crash_symbolication] fixed file extension check for symbol file edit
* [crash_symbolication] fixed file extension check for symbol file upload in script fallback cases
* [crash_symbolication] correctly distinguish views crash views
* [funnels] none existing uid fix

**Development related**

* [scripts] make sure fork tests don't fail on travis due to deployment scripts

## Version 18.04

**Fixes**

* [crashes] fix regex for parsing new lines
* [crashes] fixes on sorting and handling empty set
* [frontend] ensure app links work even if app linking is disabled
* [frontend] fix data table export bug on some tables
* [frontend] prevent duplicate list loading from api
* [frontend] remove alert warnings from TableTools
* [push] handle deleting cohorts used in auto push
* [reports] fix css overriding with prefix
* [sliping-away] correct displaying percentage
* [sources] correctly group domains
* [sources] correctly parse keywords

**New Features**

* [api] added a way to delete specific app user
* [api] added a way to export data about specific app user
* [compliance-hub] for handling consents and provide way to comply with GDPR
* [crashes] clean crash_users when possible
* [events] added Event Management
* [events] added functionality to omit specified event segments
* [events] added overview of multiple custom selected events and their metrics
* [logger] display list of problems with request
* [logger] recognize consent requests
* [populator] added consent emulation
* [push] adding concurrency limit for push:send job
* [push] adding skipPreparation parameter
* [push] prevent passed-date scheduling from dashboard
* [push] total users fix again
* [systemlogs] add cd for possible ttl index
* [views] limit view name length

**Enterprise Edition features**

* [alert] add app_id in path for crash detail link in email
* [drill] force predefined meta types
* [drill] record app_version for drill
* [restrict] add support for blocking compliance plugin api on section restrict
* [users] make tabs linkable
* [users] visualize objects as properties

**Enterprise Edition fixes**

* [alert] fix timezone check
* [alerts] fix for period check
* [attribution] fix installation script, if indexes already exist
* [cohorts] checking for active auto messages when deleting a cohort
* [groups] disabled "groups and section access" for own users
* [users] process both cohorts query formats

**Development related**

* [api] added separate app_users.js module to handle app users
* [cmd] countly fs correctly deal with sub directory identifiers
* [cmd] update npm packaged on plugin upgrade command
* [cmd] use new hash for passwords when creating/removing users
* [countlyCommon] allow to get dashboard stats for segments too in countlyCommon.getDashboardData method
* [countlyCommon] more customizable way to record custom metrics
* [db] fixes when using mongodb connection string
* [process] change title of Countly processes

## Version 18.01.1

**Fixes and additions**

* [UI] Add a button to toggle the sidebar
* [UI] Softer green/red colors for sparklines and trend indicators
* [api] ensure device_id should always be a string
* [apps] clear older data fix
* [db] added more indexes to speed up queries
* [db] use driver default keepalive
* [cmd] command line to get mongodb connection params
* [crashes] break line before resolution
* [data-migration] fixed bug checking received file type
* [data-migration] fixed credential migration
* [data-migration] fixed internal events migration
* [frontend] Auth token now is created also after setup
* [frontend] display month and day graphs for full period
* [frontend] do not use app namepsace when no app is created
* [frontend] fix dtable CustomDate order issue in ko, ja and zh
* [frontend] fix showing percentage of platform version
* [frontend] localization fixes
* [frontend] update global user properties when changes made in management
* [logger] remove highlighting of json data for better performance
* [logger] output incorrect json as string
* [plugins] Max limit for session timeout has been set to 32bit integer.
* [push] Added missing cohorts names
* [push] Fix for sending a message to user in specific cohort
* [push] Fixed credits upload issue
* [push] Fixing token filtering for automated push
* [reports] email format update
* [tests] add debug like feature for tests

**Enterprise Fixes and additions**

* [block] Fix typo
* [crash_symbolication] fixed crashes in job
* [cohorts] Fixed big list selection problem on create cohort view.
* [cohorts] Remove deleted cohorts from selection
* [dashboards] Fix widget drawer reset
* [dashboards] Hide sidebar toggle in dashboards view
* [drill] Fixed limited connection pool size 
* [drill][block][cohorts] convert numeric values to number only for custom properties
* [funnels] Calculation of total users in a perriod changed to get sessions from drill database.
* [funnels] Fixed last row data problem.
* [funnels] Funnels bars length issue has been fixed. 
* [live] Prevent realtime bar content wrapping
* [live] Responsive UI modifications
* [revenue] Responsive UI modifications
* [users] Added crashes tab to user profiles
* [users] Fixed exporting users with cohorts filter
* [white-labeling] Localization modifications

## Version 18.01

**Fixes**

* Add export period to file name on export, if possible
* Added separate post install script to allow running countly under countly user
* Better duplicate request handling with logging (can be disabled in configs)
* Bulk request fixes on waiting to process previous request, preventing them from pile up
* Centos/RHEL installation fixes for nginx and supervisord
* Changed formatting of date to be more locale independent
* Countly backup and restore commands now work even if mongodb is on another server
* DBViewer: optimize displaying collections for big amount of events
* Error Logs: renamed to Server logs
* Event Logs: show warning about limited data
* Fix export dialog dropdown overflow in some cases
* Fixed UI overflow for windows new Chrome versions
* Fixed collapsing sticky table header in some cases
* Fixed selecting API key in user menu
* Handling future and incorrect timestamps
* Handling session age properly to prevent old sessions piling up
* Improved merging user properties on user merge
* MacOS scroll bars issue has been fixed
* Optimizing events view reloading (do not reload when not needed)
* Plugin upload: works with plugins with dependencies
* Plugins: disable pagination for plugins table
* Push: fixed getting correct user profile query
* Server Logs: handle properly when not possible to open file
* Server stats: fixing data collection and reporting
* Sorting server side tables on initialization, to save 1 request to the server
* System logs: process search separately from filter
* System logs: removed time selector
* Trimming username or email on input when logging in or creating account
* Views: fixing not displaying data on graph for views containing dot in the name

**New Features**

* API can now be authorized either with API key or Auth token
* Added a way to link to specific user in Management-> Users
* Added app reset (additionally to existing clear data) to reset app to initial state
* Configurations: new UI, now searchable
* Crashes: add resolving state to indicate the process started for resolving crash
* Dashboard URLs are now app namespaced, so copying links would automatically select proper app (configurable)
* Data migration: new plugin to easily move data from one countly server to other
* Email reports: new design and ability to name and toggle reports
* Event Logs: now shows if request was canceled and why
* Format event duration as seconds
* Full FS and GridFS support (switching for shared storage in config)
* New installations use MongoDB 3.4
* New location behavior, using more precise location data from location params, if possible
* Populator: now also generates cohorts if plugin available
* Removed app_users uid sequence to apps collection, to have clean collection for BI tools
* Sources: new way of preprocessing web sources, smarter domain filtering
* Systemlogs: linking to specific user who made action
* Times of day: new plugin to show app usage on specific time of day or day of the week
* UI changes, like favicon, new notification style
* Views: Added heatmap click breakdown by resolution (requires Web SDK update)
* Views: Added scroll maps (requires Web SDK update)
* Web: Added website domain setting for app, to eliminate need for selecting domain for heatmaps

**Enterprise Edition features**

* Alerts: added more metrics for alerts, as Bounce rate, Number of page views, Purchase sum
* Attribution: 7 day click data retention
* Attribution: added custom segment limit
* Attribution: added server to server campaign by matching advertising ids
* Cohorts: add times user made action
* Cohorts: added crash and view events
* Drill: Added Browser version as drillable property
* Drill: Catch big list overflow and mark it as full
* Drill: Moved drill meta to separate collection and provided migration scripts, if user wants to have clean drill collections for BI tools
* Drill: Switch to big list instead of string, when exceeds list limit
* Funnels: showing dropped/lost users between funnel steps and other UI changes
* Restrict: Improvements to restrict and allowing to change restriction dynamically
* Restrict: correctly get menu texts when allowing/disallowing menus
* Retention: switched to showing absolute retention
* Users: display funnel durations
* White labeling: added favicon change support

**Enterprise Edition fixes**

* Attribution: handle redirects correctly, when app data was migrated
* Blocking request: renamed to Filter requests
* Cohorts: Cannot edit cohort when one of the events deleted
* Cohorts: process query correctly when viewing user subsets in drill, push, etc
* Cohorts: remove BY queries
* Drill: Correct cohorts behavior in AND or OR queries
* Drill: Correctly get start of the week for weekly reporting
* Drill: Remove cohorts from BY queries
* Drill: fixed interpreting . as regex symbol in drill filters
* Drill: interpret numeric values in filters as numbers
* Filter requests: Allow editing rules
* Filter requests: Allow toggling rules
* Filter requests: prevent duplicated rules
* Funnels: clearing cache properly on app reset
* Live: switch to TTL data limitation instead of capped
* Symbolication: added file format check

**Development related**

* Added Vagrant support
* Added a way to get mongodb command line connection from config files
* Added a way to hook into Backbone url processing
* Added endpoint for precalculated event data
* Added new rights module with promise support to validate users
* Allow plugins to add command line commands
* Allow running separate plugins test suite through command line on unclean instance
* Command line: additional checks on user management
* Create common.db connection on master process
* Dashboard now uses token based authentication when communicating with API
* Removed properties pe, crashes, old, lat and lng from app_users

## Version 17.09

**Fixes**

* Serverside models caching data when not needed
* Countries API endpoint was not returning data
* Ignore Mac specific files when merging production files
* Reconnect correctly to database if mongod process goes down
* Round up numbers in server side models if value is number
* Density: round up values up to 2 decimal places
* Crashes: Fixed link for crashes when segmenting
* Reports: fix localization and period caches
* Reports: fixed getting correct data when multiple jobs are running
* Reports: added unique user estimation correction
* Views: SDK might provide timestamp instead of duration fix
* Configuration: use dot as delimiter for config UI building, allowing plugins have - in the name
* Configuration: renamed warning to be consisted with internal setting
* DBViewer: fix not unobfuscating internal events when there are no custom events
* Persistent settings across logins for dashboard items

**New Features**

* Display API key in the top bar user dropdown
* Users now have access to Management menu with read only accessible views
* Invalidate sessions on password change
* Add warning when changing App Key
* DBViewer: stream documents for larger outputs
* Crashes: use worker to highlight stack traces
* Increase upload size in Nginx for larger files
* API supports custom period of last days
* Password hashing algorithm changed from SHA1 to SHA512
* Show last used app even after logging out
* Plugin upload: Allow uploading plugins from UI and attempt to recover on faulty plugin upload
* Smart cache invalidation for more seamless upgrades and plugin state changes
* UI changes: table dropdown options
* Internal changes: more internal events for management, datatables and subrows
* Persistent settings for dashboard UI choices

**Enterprise Edition features**

* Crash symbolication: new plugin allowing symbolicating iOS and Android stack traces
* Alerts: new plugin that triggerts email alerts when a metric changes (e.g session, users, crashes)
* Cohorts: new plugin that allows selecting users in different groups and using that as a segmentation option
* Group permission management: new plugin that helps setup permissions for multiple users simultaneously
* White labeling: new plugin to help modify logo and colors via the user interface
* User Profiles: allow segmenting subsets of users from drill, funnels, etc
* Attribution: add Universal Adword campaign support

**Enterprise Edition fixes**

* Drill: fixed lists not switching to string input in some cases
* User Profiles: improved meta exclusion from users table
* User Profiles: round duration property in user profiles
* User Profiles: hide longer id in the table
* Attribution: correctly delete graph data on clear
* Dashboards: round up number for number widget

## Version 17.05.1

**Fixes**

* Fixed loading swf file while not being used
* Exclude old SDKs from duplicate request check
* Fix in some cases displaying Event segment values, which are numbers with [CLY]_ prefix
* Fixed API returning data for incorrect timezone in some cases
* Fixed caching server model changes resulted in undefined output in some cases for models
* Fixed countries endpoint
* Fixed external installer to be compatible with tar.gz format
* Minor UI fixes (jumping subrows, show no data after refresh, table formatting)
* Correct new users count with estimation correction data in some cases
* Export: Fixed broken export file names in some cases (like unicode chars, new lines, etc)
* Export: Fixed applyng queries correctly to server side exports
* Reports: Fixed caching title/text problem
* Reports: Fixed erroring and resending report multiple times
* Assistant: fixed some saved notifications not showing up
* Assistant: improved performance
* Jobs: Force close process if it did not close
* Push: send data in smaller batches for APN

**Features**
* Display browser version in Analytics -> Browsers
* Report Manager: make report threshold (time before switching to report manager) a configurable value
* Export: added max export limit as configurable value

**Enterprise**
* Fixed: Attribution not recording segments in some cases
* Fixed: List not switching to string type for drill segmenting, upon reaching limit
* User profiles: display device ID and UID in profiles

## Version 17.05

**New features**

* New topbar that holds many action buttons. This replaces bottom bar and adds app selector, dashboard selector and configuration options (e.g password change, settings, language switcher etc).
* Rich push support for iOS and Android, which includes ability to send images and videos to devices.
* Interactive push support for both platforms, with ability to add up to 3 buttons in a push notification.
* New Assistant plugin can be used to get more insights from devices and keeps you up to date with data. 
* Inside Crash Analytics, now it's possible to make multi crash selection for actions like resolve, unresolve, hide, show, delete, etc
* Event logs plugin can record whole request data
* Record metrics and some default values even without sessions
* Views now has new heatmaps injected in website (requires latest SDK update)
* Improved view loading and reloading
* Android badge support for push notifications
* Server side data export for Crash Analytics
* Documentation through comments
* Validate sha256 checksums

**Enterprise Edition Features**

* New Dashboard plugin: Provides ability to add as many custom dashboards as you want, and share with your colleagues
* New Flows plugin: Shows step by step movement of event flows
* New Report Manager plugin can save, show and run long-running drill and funnel queries
* Revenue plugin can accept multiple in-app purchase keys
* DBViewer and User Profiles now has server side export
* Crashes plugin gets the ability to be filtered
* Analytics > Views data is now drillable
* Fix: Live users plugin - resume online user after inactivity for web SDK

**Fixes**

* Server stats - fix collecting sessions
* Api - accept milisecond float timestamps
* Email reports - fix fetching event data

## Version 16.12.3

This is a bugfix release.

* Fix: Estimated data for full buckets
* Fix: Changing password validation on server side
* Fix: Push - Audience calculation when sending to multiple platforms
* Fix: Push - Error for API originated messages
* Fix: Server Stats - incorrect data output
* Fix: Server Stats - counting extend sessions as new sessions
* Fix: Populator - fixing typos in generated data
* Fix: timestamp data range starting from January for period year
* Fix: setting amount of failed logins from configs ui
* Fix: stripping surrounding quotes in csv exports
* Fix: Optimized event summary generation with lots of segment values
* Do not record old property for device_id changes with merges
* Do google services check upon installation and disable them if not usable
* Added password rotation amount to prevent reusing same passwords
* Fix: Enterprise User profiles: accept 0 and false as valid custom property values
* Fix: Enterprise User profiles: internal events as crashes or views were not displayed if there are no custom events
* Fix: Enterprise User profiles: do not reload userprofiles table if previous request is not yet finished
* Fix: Enterprise Attribution: do not reattribute if user is older than 5 minutes and have a session
* Fix: Enterprise Drill: do not count session extends as separate sessions
* Fix: Enterprise Drill: bug in displaying Monthly data in beginning of the year
* Fix: Enterprise Push: allow some users to skip approve for push messages
* Fix: Restrict: export also allowed sections for user management exports

## Version 16.12.2

This is a bugfix release.

* Fix: Push - send badge data to Android
* Fix: Loading code.count.ly for https servers
* Fix: using unencrypted password for MongoDB
* Fix: displaying bar data in external/shared crashes
* Fix: installing g++ 4.8 specifically
* Fix: Checking if crash plugin enabled in reports
* Fix: Star rating time series data visualization
* Fix: Sort crash bars in descending order
* Fix: Do not load large meta on refresh
* Fix: Optimize merging unique values from arrays
* Fix: Enterprise Geo plugin UI
* Fix: Enterprise Taking correct attribution campaign names in drill graphs
* Fix: Enterprise Recording campaign data before processing data in drill
* Fix: Enterprise Push Maker Aproover plugin

## Version 16.12.1

This is a bugfix release.

* Fix: Getting email report data correctly
* Fix: Bug with recording custom metric functionality
* Fix: Correct weekly buckets when year is changing
* Fix: Correct titles to weekly buckets
* Fix: Enterprise Showing custom properties in user profiles
* Fix: Do not refresh dashboard for past periods
* Fix: Push - decreasing amount of concurrent streams
* Fix: Push - remove scheduled job on message deletion
* Fix: Push - certificate parsing
* Fix: Add uid even if uid-sequence was not created
* Fix: Sorting data in bars
* Fix: Milisecond timestamp not recorded in some cases
* Fix: Enable DBViewer by default on new installations
* Feature: Allow detecting ip address from the right side of X-Forwarded-for header

## Version 16.12

**Improvements**

- New user interface: 16.12 release includes the biggest visual overhaul to the entire Countly user interface, greatly improving not only the UI but also the user experience. Dashboard is now faster than ever with simplified graphs, icons, less CSS and markup. 
- New languages: Countly is translated into Hungarian and Vietnamese, and now [supports more than 10 languages](https://www.transifex.com/projects/p/countly/). 
- 5 new plugins 
    - [Compare:](http://count.ly/plugins/compare) All custom event and application data can easily be compared on a time series chart. 
    - [Star rating:](http://count.ly/plugins/star-rating) A simple plugin in order to understand end user’s ratings about your application. This plugin shows a popup when called on the SDK side (inside the mobile app) prompted the user to submit send rating information. 
    - [Slipping Away Users:](https://count.ly/plugins/slipping-away-users) This plugin displays a list (and count) of users who haven’t used the application for a particular period, e.g for 7, 14, 30, 60 and 90 days. 
    - [Server stats:](https://count.ly/plugins/data-points/) This plugin displays how many data points (sum of sessions, custom events, pageviews, crashes and push data) a Countly server has collected for the last 3 months. 
    - Desktop analytics: Countly now has support for Windows and Mac OS X desktop application types. User interface changes accordingly to provide relevant information for desktop application types. 
- Security 
    - A new extensive login security plugin makes sure brute force login attempts are identified and eliminated by limiting number of wrong login attempts. 
    - System administrators can specify how strong passwords need to be. Minimum password requirements such as length, uppercase or special characters can be set. 
    - There are several additional HTTP response headers for a more secure infrastructure.  
    - There is a password expiration mechanism, editable from Configurations. 
    - Proper HTML escaping has been added to prevent HTML injections, editable from Configurations. 
    - Javascript errors are hidden from the browser console. 
    - MongoDB password in configuration file can be set in an encrypted way. 
    - Countly can be configured to use a salt (from Management → Applications and inside the SDK) to add checksum to SDK requests in order to prevent parameter tampering. 
    - System administrator can lock users in order to prevent them accessing the dashboard or API. 
- Push notifications 
    - Push overview is redesigned, to show only meaningful and important metrics. Instead of unreliable numbers that change from platform to platform (eg. delivery rate), we simplified metric page to show most important numbers and past performance, based on weekly and monthly deliveries. 
    - It’s possible to view how a push message will look on Android and iOS prior to sending it. 
    - You can send a push notification to a user based on her/his local timezone. 
    - Geolocation definition is greatly improved, using OpenStreetMap and Leaflet JS. 
    - Geolocations can now be app specific or global. 

- Crash analytics 
    - Error logs are now syntax highlighted for easier readability. 
    - Fix displaying crashes for web apps externally. 
    - Do not allow bots to index shared crashes which can be read by 3rd parties. 

- System logs 
    - There are now more than 30 system logs stored for audit purposes (Management → System Logs).  
    - Filter system logs based on specific user and user actions. 
    - System logs display before and after values for update operations. 
    - Actions of a specific user can be accessed by clicking “View User Actions” button under Management → Users. 

- General 
    - New horizontal bar chart visualisation is added and is used for Analytics → Platforms and Analytics → Densities. 
    - iOS density and web pages pixel ratio has been added to Density plugin, and values are now segmentable by platform. 
    - Added “Show details” link to Management → Applications which displays information about the application including creation, edit, last data recorded time and all users who have access to that application. 
    - Added a configuration option to prevent crash list from growing too long. 
    - Better logging for uncaught/database errors & crashes.
    - Error logs (Management → Error logs) now output shorter logs, eliminating potential page slow-downs when viewing this page.
    - Single install script (countly.install.sh) which auto-detects which install procedure to execute based on OS and OS version (e.g Ubuntu, Red Hat or CentOS). 
    - OS based MongoDB version is installed and configured automatically. 
    - Accept all timestamps in second, millisecond or float format from the SDKs. 
    - There is no need to call begin_session to create a user on server. This way, a user is created for any request with a new device_id. 
    - Allow changing number of items displayed in server side paginated tables (e.g 50, 100 or 200). 
    - Management → Users displays the last login time.  
    - Clearing an application now only clears analytical data and leaves all other data (e.g configuration in push notifications or attribution analytics). 
    - Time ago now displays actual time on hover tooltip. 
    - Separate export and display data for some tables. 
    - Export file name now changes based on where data is exported from, to eliminate file mixups. 
    - Each user can now maintain their own app sort list. Previously when a change was made, it affected all users. 
    - Instead of mobile device and model names (e.g SM-G930F), now we use marketing names of corresponding models (e.g Galaxy S7) under Devices and filtering dropdowns, using Google’s Android device mapping list. 
    - Carriers are filtered out and converted to names using MCC and MNC codes. 
    - For image resizing, jimp library is used instead of sharp for less OS specific library dependencies. 
    - Application administrator can change App key and all users can change their API key. 
    - Countly command line has autocomplete capabilities. Also new commands are added, namely countly reindex (reapply all Countly database indexes), countly encrypt (to encrypt a value), countly decrypt (to decrypt a value), countly task (to run grunt tasks in a more convenient way) and countly config (to allow unsetting configuration values). 
    - Sources plugin uses preprocessed data for faster loading and can extract keywords from referral data and display it under Analytics → Search Terms. 
    - DBViewer plugin 
        - Allow users with read permission to access data for specific application(s) she/he has access to. 
        - Enhanced API to provide filtering capabilities based on MongoDB query mechanism. 

    - Populator plugin can generate more realistic and platform dependent data, to onboard end users easier. 
    - IDFA fix plugin is introduced to ignore opted out iOS users until new app version upgrade. 

**Performance**

- Countly now uses a data splitting algorithm on all metrics, events and users collections. This results in better performance for high traffic deployments and takes better advantage of MongoDB sharding mechanism. 
- Added better handling of capped collections, indexing and reindexing options. 
- Now there is a single point for updating users collection, resulting in less read and writes from SDK requests. 
- Using objects instead of MongoDB arrays for meta data. 
- Optimize health check (ping) request. 
  
### Changelog specific to Enterprise Edition (available to Enterprise Edition customers only)

- User Profiles, Drill, Funnel and several other plugins are simpler and more easier to work with, using a modern and up to date user interface. 
- Retention plugin, Funnels and User Profiles have a visual overhaul to show even smallest details, all introducing new designs. 
- Drill plugin 
    - Checking property limits correctly, also for user properties. 
    - Better labels and data sorting for time buckets with periods larger than a year. 
    - More precise event timeline ordering based on unique millisecond timestamps from the SDKs. 
    - Big list dropdown implementation for large amounts of list values (e.g for sources and views). 

- Restrict plugin 
    - Improved restriction UI. 
    - Restrict API access for blocked users. 

- User Profiles plugin 
    - Custom properties are shown in alphabetical order. 
    - Correctly display user's funnel progress and device names. 

- Attribution Analytics:  
    - Correctly record unique clicks for some time periods. 
    - When there is a long list of campaigns, it’s possible to hide them so they don’t clutter user interface. 
    - Greatly improved user experience and user interface. 
    - Re-designed campaign popups. 

- When recaptcha is enabled from Configurations, it asks for recaptcha confirmation on login. 

## Version 16.06

This version provides several features and bugfixes to both server and SDKs. There are a lot of improvements in Countly core, and you are advised to upgrade. Below you can find notable changes for both Community Edition and Enterprise Edition. 

### Changelog for both Community Edition and Enterprise Edition

* Feature: We developed Countly Code Generator (http://code.count.ly) to help developers integrate their SDKs easily. 
* Feature: We provided several one liner explanations in Countly configuration options (under dashboard > Management > Configuration)
* Feature: Charts now full day for today's chart, instead of capping to current time. 
* Switched from MongoDB 3.0 to 3.2. 
* Feature: Command line now checks whether user is root and displays meaningful message for root needed commands
* Feature: App key of application and API key of user can be changed from dashboard. This is nice in circumstances where keys should be modified in SDK but this is not a viable method.
* Feature: Previously it wasn't possible to rename events with key names containing dots. As you may have guessed, this is not the case any more. 
* Feature: Countly now uses bulk report sending through jobs, rather than cronjob for each separate report.
* Feature: Reports now also display overall events data and also benefit from datatables library when managing reports. 
* Feature: We dropped using Imagemagick, and started using Sharp node module instead. 
* Feature: Add IPv6 listen directive to Nginx config to make sure we are ready to use IPv6 in the future.
* Bugfix: There is a fix in bulk API that now helps API run smoothly in certain conditions.  
* Bugfix: All known issues with push notifications have been fixed.
* Bugfix: Date selector issue inside push notifications have been fixed.
* Bugfix: Corrected user estimation with active users data.
* Bugfix: Fixed unique click reporting in attribution.
* User experience: App management is visually improved with hints and value order.
* User experience: All apps data fetching is greatly optimized.
* User experience: User management table is redesigned with datatables. 
* User experience: Data populator has been revamped so it generates less random and more meaningful data with less overhead for browser. 
* User experience: We removed unused fields for web analytics.
* User experience: When Google services are disabled (mainly for servers in China), switching between cities and countries and displaying simple table of countries on dashboard is now possible. 
* User experience: Improved plugin state syncing between two Countly servers, with option to disable it.
* User interface: There is now a new and improved side bar UI which looks and behaves a lot better than the old, one-level navigation bar. 
* User interface: There is a new, shiny pre-login page design that you'll probably love.
* User interface: Main dashboard has been redesigned and better graph tooltips have been added to graphs. 
* User interface: Removed app category from app creation since we think your time is valuable.
* User interface: Whole UI is now more modern - lots of small & lovely retouches everywhere 
* User interface: Loading bar has been renewed with a modern one.
* User interface: When clicked on cog, user settings are now displayed in full screen instead of popup.

### Changelog specific to Enterprise Edition (available for Enterprise Edition customers)

* Bugfix: We have made a few fixes for data types interpreted incorrectly for custom properties and provided historical values of user properties for selected period.
* Drill: Bookmark management is now available through API.
* Drill: Plugin can use disk space for large aggregated queries.
* Drill: Plugin now can perform BY queries without AND.
* Drill: It's possible to query session by length/duration
* Attribution Analytics: It's possible to report organic conversions with Web Analytics.
* Attribution Analytics: It's possible to select which campaigns to compare.
* Attribution Analytics: a new configuration to pass campaign data to end URLs or not.
* Attribution Analytics: It can pass all the properties to postback url, including custom ones
* Attribution Analytics: User can hide a campaign when completed, to declutter user interface.
* Attribution Analytics: Optimization of loading data by separating campaign properties and analytical data.
* New plugin: Retention with segments, where retention table can be drilled down into segmentation values.
* New plugin: Restrict access, where admin can define who can see what part of the dashboard. 
* New plugin: Block requests, where admin can block certain type of requests coming from devices or web apps.

### Updated SDKs 

* Windows Phone SDK updated, with 60 seconds intervals instead of 20.
* iPhone SDK updated, with many features and bugfixes.
* Android SDK updated, with many features.
* Web SDK updated to reflect changes on 16.06 release
* Nodejs SDK updated to reflect changes on 16.06 release

## Version 16.02.1

### Changelog for both Community Edition and Enterprise Edition

  * Fixed Checking GCM credentials
  * Fixed Showing feedback link, if intercom is not enabled
  * Fixed DB settings for replica sets
  * Fixed problem with data on Sharded servers (documents coming in different order)
  * Fixed MongoDB configuration on Ubuntu Willy
  * Fixed GCM sent count for tokens replaced by GCM 
  * Use NodeJS 5.5 for compatibility with push functionality
  * Fixed inconsistencies with MongoDB 3 findAndModify
  * Fixed help localization for app version
  * Added remote installer script to install Countly 

        wget -qO- http://c.ly/install | bash

### Changelog specific to Enterprise Edition (available for Enterprise Edition customers)

  * Fixed sorting columns for attribution


## Version 16.02


### Changelog for both Community Edition and Enterprise Edition

  * Web Analytics feature, one of the major app types Countly now supports
  * Support for different app types, where each app type can have different views and dashboards  
  * HTTP/2 transport for Apple Push Notifications service, single certificate for both: development & production environments
  * Sources plugin, showing sources of your Web visitors or Android app installations (replacing stores plugin)
  * Support for themeing, and switching between different themes
  * Views plugin to track time which user spent of specific application view/screen
  * Server now uses MongoDB 3 and NodeJS 5
  * Internal job queue and scheduling
  * Support for duration property for events to measure timed events
  * Lots of new command line commands (managing plugins, changing configurations, more backup options, etc)
  * Allow disabling Google services (for users who live in regions where Google is blocked)
  * Server side and email localization ( #214 )
  * Support for tv OS and Watch OS 2
  * DB Viewer plugin now provides decrypted collection names
  * More complete localization, making all strings translatable, including emails
  * Added new data generating features to Populator plugin for data generation

### Changelog specific to Enterprise Edition (available for Enterprise Edition customers)

  * User Profiles - allow segmenting users, and view user list from drill, crashes and attribution plugins
  * User Profiles -  store custom properties as arrays, for multiple values, as well as provide atomic on server operations, like increase, max, min, etc.
  * More drillable properties and Drill property categorization
  * Allow tracking custom segments with Attribution Analytics
  


## Version 15.08


### Changelog for both Community Edition and Enterprise Edition

  * Introduction of crash analytics ([Issue #152](https://github.com/Countly/countly-server/issues/152))
  * Countly can now be run via [command line](http://blog.count.ly/post/127181109353/countly-behind-the-curtains-heres-how-we-make)
  * Email reports plugin sending daily or weekly summary of your app statistics ([Issue #3](https://github.com/Countly/countly-server/issues/3))
  * App sorting is now user specific
  * Browser plugin displaying browser metric for Web SDK and other web platforms
  * Stores plugin to track from which store was the app installed (Android)
  * Enhancements to plugin mechanism (shared configs) ([Issue #175](https://github.com/Countly/countly-server/issues/175))
  * Display time with logs ([Issue #155](https://github.com/Countly/countly-server/issues/155))
  * Merging multiple same value metrics ([Issue #148](https://github.com/Countly/countly-server/issues/148))
  * App Apps View fixes ([Issue #144](https://github.com/Countly/countly-server/issues/144))
  * Metric switching on map ([Issue #141](https://github.com/Countly/countly-server/issues/141))
  * Push plugin should stop sending notifications and return error for Mistmatch Sender ID GCM error ([Issue #163](https://github.com/Countly/countly-server/issues/163))
  * Ability to run under Ubuntu 15.04 with systemd ([Issue #143](https://github.com/Countly/countly-server/issues/143))
  * Languages should show long language names instead of language codes ([Issue #140](https://github.com/Countly/countly-server/issues/140))

### Changelog specific to Enterprise Edition (available for Enterprise Edition customers)
  
  * Enhanced Drill (Query Builder) with new metrics, user properties, custom properties, attribution campaigns and crashes
  * Funnel segment applied to all steps ([Issue #173](https://github.com/Countly/countly-server/issues/173))    
  * Added Organic data to Referal Analytics ([Issue #153](https://github.com/Countly/countly-server/issues/153)) 
  * New metrics added to User Profiles, e.g crashes, attribution and other ([Issue #170] (https://github.com/Countly/countly-server/issues/170))


## Version 15.06


### Changelog for both Community Edition and Enterprise Edition

* API accepting both GET and POST requests
* Added Github update plugin to update source from Github
* Improved performance and lots of fixed for push server
* Populator plugin sends also crash data
* Displaying long app names through tooltip
* Sorting resolution dimensions as numbers
* Switching between sessions and user metric on map
* Deleting multiple events
* Displaying full language name for locale plugin
* Option to clear older data (older than 1 month, 3 months, 6 months, 1 year, 2 years)
* Logger plugin recognizes user details and crash requests
* Reducing maximal file log size to 50 Mb
* Fixed copying images for production using grunt
* Fixed long app names in AllApps view
* Fixed error on propagating app update event to plugins
* Fixed reset page


## Version 15.03.02

### Changelog for both Community Edition and Enterprise Edition 

* Fixed get_events api method
* Fixed Docker support
* Fixed using specific MongoDB driver (fixes undefined name property crashes after installation)
* Fixed socket options for more stable connection to mongodb
* Push bug fixes
* Improved dashboard loading by combining localizations and css files
* Improved Push performance
* Added upgrade script to 15.03 version from older versions
* Added github core update script, to update installations cloned from github
* Moved all dependencies to Countly root folder
* New minification through uglify, no need for heavy java dependencies
* New API v3 requests for Loyalty, Session frequency and Session durations
* Allowing to change device_id

## Version 15.03


 
### Changelog specific to Community Edition 

  * Introducing Plugins system, allowing other developers to write plugins which would extend Countly functionality without changing/breaking the core. For more information on how to write a plugin, see [Countly resources](http://resources.count.ly)
  
  * Lots of plugins come with new functionality in this release, including:
   * Data Populator
   * Event Logger
   * Database Viewer
   * System Logger
  
  * New core and scalable data structure, dividing data into years and months to prevent reaching MongoDB document size limit.
  * Upgraded to using latest Mongoskin version and newer MongoDB driver which supports new connection string format (https://github.com/Countly/countly-server/issues/124)
  * Countly now ensures that it uses latest MongoDB version
  * Now Countly can be installed and run from subdirectory, more info (https://github.com/Countly/countly-server/issues/19)
  * Countly can be run with countly user. For more information, see README under /bin directory before running corresponding script to install Countly.
  * All dependencies are now defined in package.json and can be downloaded using install script (https://github.com/Countly/countly-server/issues/4)
  * All apps view implemented displaying list of all apps and their dashboard statistics (https://github.com/Countly/countly-server/issues/122)
  * Accepting bulk requests as post
  * Displaying default app icon instead of nothing
  * You can now login using username or email address
  * All tables in Countly now use Datatables for more interaction, as sorting, filtering, etc.
  * New API enhancements, as providing country and city, or returning precalculated stats for implementing dashboards
  * Allowing any origin on API to allow CORS for ajax queries on different domains
  * Added new iOS device identifiers (iPhone 6 and iPhone 6S)
  * Fixed bug displaying user roles
  * Fixed falling back to English if browser language is not defined (https://github.com/Countly/countly-server/issues/101)
  * Fixed locked scrolling after using slimscroll in some cases (https://github.com/Countly/countly-server/issues/128)
  * Navigation bar has scroll. It eases moving between navigation items

### Changelog specific to Enterprise Edition (available for Enterprise Edition customers)

  
  * Fixed displaying long funnel names (https://github.com/Countly/countly-server/issues/107)
  * Numerous other minor fixes and improvements
  

## Version 14.08

* Added density reporting for Android
* New license, check LICENSE.md for details
* Visual improvements, cross-browser compatibility fixes
* Fix issue #81 (https://github.com/Countly/countly-server/issues/81)
* Fix issue #87 (https://github.com/Countly/countly-server/issues/87)
* Fix issue #91 (https://github.com/Countly/countly-server/issues/91)
* Fix issue #92 (https://github.com/Countly/countly-server/issues/92)
* Fix issue #96 (https://github.com/Countly/countly-server/issues/96)


## Version 13.11

* Fix issue #88 (https://github.com/Countly/countly-server/issues/88)
* Fix issue #98 (https://github.com/Countly/countly-server/issues/98)
* Fixed minor error in English translation
* Renamed LICENCE.md to LICENSE.md

## Version 13.10

* Add new iPhone device names (iPhone 5S and iPhone 5C)
* Add replica set configuration for MongoDB (https://github.com/Countly/countly-server/pull/74)
* Fix issue #77 (https://github.com/Countly/countly-server/issues/77)


## Version 13.09

  * Optimizations and fixes to the API for viewing the data on Countly for iPhone
  * Optimization for begin_session and end_session handling especially to prevent
    a new session creation on Android when the user changes the screen orientation.
    end_session is ignored if begin_session is received less than ~10 secs ago.
  * Added "Yesterday" to available date buttons
  * Fixed platform versions visualization of Mac
  * General UI optimizations

## Version 13.06

  * Added session durations view that shows users categorized into predefined
    session duration buckets. User is categorized into one of 0-10 seconds, 
    11-30 seconds, 31-60 seconds, 1-3 minutes, 3-10 minutes, 10-30 minutes, 
    30-60 minutes or > 1 hour according to this session duration (accessible
    from Engagement > Session durations)
  * Added resolutions view that shows detailed device resolution data
    (width and height) for new and all users using two pie charts (accessible
    from Analytics > Resolutions).
  * Added cluster mechanism to api.js to fork itself according to number of
    cores in the server in order to increase utilisation. This can also be
    configured from api/config.js by changing "worker" count.
  * Added two new API paths, /o/analytics/dashboard and /o/analytics/countries
    that returns ready-to-use metrics for today, 7 days and 30 days. This API
    is used by Countly Mobile Apps.
  * Added individual event key deletion to event configuration modal.
  * Improved and optimized update mechanism during dashboard navigation. 
    Navigation is now much more smoother.
  * Added a script (bin/geoip-updater.sh) to fetch and update geoip data. 
    Running this script will update country and city database from Maxmind
    database.
  * Various performance and visual improvements to Events view.
  * Added switch to turn off or change session_duration limit of 120 seconds
    in api/config.js (session_duration_limit).
  * Added host configuration to both app.js and api.js configuration files
    (/frontend/express/config.js and /api/config.js) to make it possible to 
    run dashboard and application on different servers (defaults to localhost)

## Version 12.12

  * Added Windows Phone and Blackberry WebWorks support.
  * Added management API. All user and application related operations can
    be performed through the API using an API key.
  * Modified data read API (/o) to be accessible only by using an API key.
  * Added Portuguese and Russian to available languages.
  * Added event key sorting to event configuration modal.
  * Removed "EVENTS SERVED" from the dashboard and added "TIME SPENT" metric.
  * Fixed a bug that prevented correct visualization of event data which has
    segmentation values 0-23 (hours of the day).
  * Modified event segmentation bar chart not to show stacked data.
  * Modified event segmentation count and sum below the graph to show only
    the count and sum for the selected segmentation key.
  * Optimized dashboard experience on tablet devices.
  * Added awesome animation for closing popups with ESC key :)

## Version 12.09

  * Added localization support. All the pages have translations in the 
    following languages: Chinese, Dutch, French, German, Italian, Japanese, 
    Spanish and Turkish (https://www.transifex.com/projects/p/countly/).
  * Added city level location information to countries view. City level 
    location information is available only for the country selected in 
    timezone configuration of an application. 
  * Added ghost graphs for all the 6 time graphs on the dashboard view. A 
    light gray graph will represent the previous period. For instance if "30 
    days" is selected, ghost graph will show the stats for the previous 30 
    days.
  * Added current month to the available time buckets.
  * Optimized total user calculation for date ranges other than current 
    year, month and day which already show the absolute number.

## Version 12.08

  * Added custom event support. Each event has a key as well as a count and 
    an optional sum property. There can be unlimited number of segmentation 
    keys for an event.
  * Added help mode. After activated from the sidebar under Management > 
    Help, certain items in the interface show a small descriptive text when 
    hovered on.
  * Added option to re-order applications listed in the sidebar.
  * Added option to select a single day from the date picker. When a single 
    day is selected hourly data for that day is displayed.
  * Optimized dashboard refresh process. While refreshing the dashboard, only 
    the data for the current day is requested from the read API. Current day 
    data is merged into the existing data which is fetched the first time 
    user logs in to the dashboard.
  * Fixed active application and selected date reset problem after a hard 
    page reload. Active application and selected date are stored in 
    localStorage until user logs out.

## Version 12.07

  * Added platforms view under analytics section.
  * Added app versions view under analytics section and API is modified 
    accordingly to handle _app_version metric.
  * Added summary bars to device view to show top platform, top platform 
    version and top resolution.
  * Added reset data option to manage apps screen. Global admin can reset 
    the data stored for any application.
  * Added timestamp (UTC UNIX timestamp) parameter to the write API. If 
    provided, the event is recorded with the given time instead of current 
    time.
  * Fixed application delete bug that prevented app_users collection to be 
    cleared. app_id field is added to app_users collection.
  * Fixed JSON escape issue for the read API when device name, carrier name 
    etc. contained a single quote.

## Version 12.06

  * Added user management support. A user can be created as a global admin to 
    manage & view all apps or can be assigned to any application as an
    admin or user. An admin of an application can edit application settings. 
    A user of an application can only view analytics for that application 
    and cannot edit its settings.
  * Added csfr protection to all methods provided through app.js.

