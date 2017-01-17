## Version 16.12.1

* Fix: Getting email report data correctly
* Fix: Bug with recording custom metric functionality
* Fix: Correct weekly buckets when year is changing
* Fix: Correct titles to weekly buckets
* Fix: Showing custom properties in user profiles
* Fix: Do not refresh dashboard for past periods
* Fix: Push - decreasing amount of concurrent streams
* Fix: Push - remove scheduled job on message deletion
* Fix: Push - certificate parsing
* Fix: Push - send badge data to Android
* Fix: Add uid even if uid-sequence was not created
* Fix: Sorting data in bars
* Fix: Milisecond timestamp not recorded in some cases
* Fix: Enable DBViewer by default on new installations
* Fix: Loading code.count.ly for https servers
* Fix: using unencrypted password for MongoDB
* Fix: displaying bar data in external/shared crashes
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

