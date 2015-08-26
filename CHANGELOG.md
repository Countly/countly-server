## Version 15.08

  * Introduction of crash analytics ([Issue #152](https://github.com/Countly/countly-server/issues/152))
  
  * Countly can now be run via [command line](http://blog.count.ly/post/127181109353/countly-behind-the-curtains-heres-how-we-make)
  
  * Email reports plugin sending daily or weekly summary of your app statistics ([Issue #3](https://github.com/Countly/countly-server/issues/3))
  
  * App sorting is now user specific
  
  * Browser plugin displaying browser metric for Web SDK and other web platforms
  
  * Stores plugin to track from which store was the app installed (Android)
  
  * Enhancements to plugin mechanism (shared configs) ([Issue #175](https://github.com/Countly/countly-server/issues/175))
  
  * Funnel segment applied to all steps ([Issue #173](https://github.com/Countly/countly-server/issues/173))
  
  * Display time with logs ([Issue #155](https://github.com/Countly/countly-server/issues/155))
  
  * Merging multiple same value metrics ([Issue #148](https://github.com/Countly/countly-server/issues/148))
  
  * App Apps View fixes ([Issue #144](https://github.com/Countly/countly-server/issues/144))
  
  * Metric switching on map ([Issue #141](https://github.com/Countly/countly-server/issues/141))
  
  * Push plugin should stop sending notifications and return error for Mistmatch Sender ID GCM error ([Issue #163](https://github.com/Countly/countly-server/issues/163))
  
  * Ability to run under Ubuntu 15.04 with systemd ([Issue #143](https://github.com/Countly/countly-server/issues/143))
  
  * Languages should show long language names instead of language codes ([Issue #140](https://github.com/Countly/countly-server/issues/140))
  
  * New metrics added to User Profiles, e.g crashes, attribution and other ([Issue #170] (https://github.com/Countly/countly-server/issues/170)) (Enterprise Edition)
  
  * Enhanced Drill (Query Builder) with new metrics, user properties, custom properties, attribution campaigns and crashes (Enterprise Edition)
  
  * Added Organic data to Referal Analytics ([Issue #153](https://github.com/Countly/countly-server/issues/153)) (Enterprise Edition)

## Version 15.06

  * Api accepting both GET and POST requests
  
  * Added Github update plugin to update source from Github
  
  * Improved performance and lots of fixed for push server
  
  * Populator plugin sends also crash data
  
  * Displaying long app names through tooltip
  
  * Sorting resolution dimensions as numbers
  
  * Switching between sessions and user metric on map
  
  * Deleting multiple events
  
  * Displaying full language name for locale plugin
  
  * Option to clear older data (older than 1 month, 3 months, 6 months, 1 year, 2 years)
  
  * Logger plugin recognizes userdetails and crash requests
  
  * Reducing maximal file log size to 50 Mb
  
  * Fixed copying images for production using grunt
  
  * Fixed long app names in AllApps view
  
  * Fixed error on propagating app update event to plugins
  
  * Fixed reset page
  

## Version 15.03.02

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

  * Introducing Plugins system, allowing other developers to write plugins which would extend Countly functionality without changing/breaking the core. For more information on how to write a plugin, see [Countly resources](http://resources.count.ly)
  
  * Lots of plugins come with new functionality in this release, including:
   * Data Populator
   * Event Logger
   * Database Viewer
   * System Logger
  
  * New core and scalable data structure, dividing data into years and months to prevent reaching MongoDB document size limit.

  * Upgraded to using latest Mongoskin version and newer MongoDB driver which supports new connection string format (https://github.com/Countly/countly-server/issues/124)
  
  * Countly now ensures that it uses latest MongoDB version.

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
  
  * Fixed displaying long funnel names (https://github.com/Countly/countly-server/issues/107)
  
  * Fixed locked scrolling after using slimscroll in some cases (https://github.com/Countly/countly-server/issues/128)
  
  * Navigation bar has scroll. It eases moving between navigation items
  
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

