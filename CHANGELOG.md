## Version 23.11.5
Fixes
 - [hooks] Fixed hook settings texts
 - [core] udated ingress to support latest api version
 - 
Enterprise Fixes:
- [formulas] text change in formulas
- [core] add required excludes to scripts
- [core] Remove tests from packages
- [core] updated hostname placeholder values
- [cms] Add more options check
- [crashes] fix for Crash-free users and crash-free sessions cannot be negative
- [dashboards] fix for notes widget
- [dashboards] fix for special characters gets messed up in dashboards
- [core] updated ingress to support latest api version
- [core] Update Versions view to new UI
- [bugfix] Correctly count datapoints
- [populator]fixes for populator plugin
- [push] Updated push settings to be able to parameterize message timeout
## Version 23.11.4
Enterprise Fixes:
- [drill] Fix for drill snapshot query
  
## Version 23.11.3
Fixes:
- [core] Script for fixing drill properties
 
Enterprise Fixes:
- [drill] Update custom properties only on session end/begin and duration. (Do not process on user_details )
- [drill] Fixed query for generating snapshot to do not error on unexpected object values
- [drill] Fixed custom property updating on incoming data for cases when property update is done with special operations like $push, $addToSet
- [drill] Sanitize keys in bulk writing process


## Version 23.11.2
Fixes:
- [push] Fixed bug to allow querying by push message name
- [server-stats] Improved logic for date picker to show graph correctly in different timezones based on selected dates.
- [core] Always Calculate city and country and store in user object based on passed coordinates, not only on session start
- [cms] Moved data fetching for guides/startup/walkthroughs to frontend
 -[core] Added script to export anonymized drill data
 
Enterprise Fixes:
- [drill] Rewriting drill query before running it on the database to look also for numeric values for a passed list of values (["1"] => ["1",1]) (Helps to better search for data if values are saved in both ways - as numbers and also as strings)
- [drill] Make sure duration is parsed before sending it for database update.
- [users] Fixes for breakdown filter.

## Version 23.11.1
Fixes:
- [scripts] Fix for Check app images scripts
- [onboarding] Fix onboarding loop for offline only installs
- [cms] Stop cms calls after failure
- [cms] Calculate timedifference against meta entry
- [heatmaps] Update deprecated methods in heatmaps.js
  
Enterprise Fixes:
- [drill] Fix the correct type prefix for widget names
- [surveys] Fix the survey api to include previous month
- [attribution] Fix encoding on campaign links

## Version 23.11
Features:
- [apps] App initial as default app image
- [compliance-hub] Use millisecond timestamp when recording consent
- [consent] Ask for countly tracking and newsletter subscription
- [core] Add config for setting maximum upload file size
- [data_migration] Fixed problem with export
- [guides] New plugin explaining Countly sections with videos and other content
- [hooks] Add validation error messages when creating hooks
- [jobs] Add the ability to pause jobs
- [license] Check license at render instead of login
- [onboarding] New onboarding flow when setting up a server
- [quickstart] Menu to show some actions new users could take
- [sdks] Add health checks with debug information
- [sdks] Add queue size metrics
- [sdks] Add request metrics
- [server-stats] Record breakdown of internal events of data points
- [settings] Trim incoming data based on API setting
- [star-rating] Make comments table serverside 
- [UI] Loading state fixes to distinguish from no data state
- [views] Make table column widths adjustable

Enterprise features:
- [ab-testing] Add user selected minimum improvement rate for the automatic stop option
- [ab-testing] Add experiment health-check logs for effective sample size and MCMC convergence
- [auth-plugins] Allow hiding/showing login form
- [block] Show the last time the filtering rule was triggered
- [cohorts] Filtering by User Property segmentation in Cohorts using OR operator
- [cohorts] Improved cohorts nightly job to reduce memory usage
- [concurrent_users] Switched user sampling to the job so it will run only once per cluster
- [crash_symbolication] Add instance id to symbolication requests
- [data-manager] Allow exporting the event schema as a data populator template
- [drill] Automatically disable estimation correction on slow servers
- [drill] Delete dashboard widgets if a related Drill query is deleted
- [drill] Make table column widths adjustable
- [drill] Table widget for dashboards
- [drill] Track how many duration updates did the session have in the document
- [drill] Update user properties on session updates, so the session always gets the latest user properties that changed during the session
- [drill] Use data snapshots to provide consistent data view between graph, table, and export
- [ingestion] Fixed some concurrency issues when updating the duration for views or sessions
- [surveys] Add ability for providing custom segment
- [surveys] Added global/app/widget level settings
- [surveys] Fixed export table
- [users] Make table column widths adjustable
- [users] New debug dialog for users merging both options
- [views] Record UTM and Source as segments on drill
- [white-labeling] Add emailing settings

## Version 23.06.16
Fixes:
- [cache] Removing noCursorTimeout from cache cursor
- [core] fix cursor timeout issue
- [core] fix for Do not set session cookie on widget load
- [core] uploadformfile was called even if it was not file upload
- [core][report-manager] fix for If a report is created for the dashboard widget, viewing leads to the dashboard with that widget.
- [core][views] Omitting views segments
- [dependencies] Bump @babel/traverse from 7.22.5 to 7.23.2
- [dependencies] Bump nodemailer from 6.9.6 to 6.9.7
- [dependencies]Bump countly-sdk-web from 23.6.0 to 23.6.2
- [permissions] Add feature check in rights
- [push] Removing past dates from recurring messages details, fixing tests, sorting trigger dates
- [ratings] fix for toggle issue in ratings
- [scripts] fix for new recheck_merges script

Enterprise fixes:
- [ab-testing] fix for ab_opt_out call when keys not supplied
- [data-manager] fix for Renamed Segment appearing in All Events
- [retention_segments] fix cohort queries when selected by breakdown
- [surveys] fix for disable csrf and session for widgets

## Version 23.06.15
Fixes:
- [crashes] Add config for activating custom field cleanup job
- [data-migration] Fix for upload request
- [core] Remove sensitive fields from API responses
- [dashboards] Validating links for note widgets
- [star-rating] Css changes for ratings comments table
- [star-rating] Fix for targeting reset on toggle
- [members] Fix full Name updates in db

Enterprise fixes: 
- [crash_symbolication] Fix for symbol file upload
- [data-manager] Fix for disabled input in view transformations
- [data-manager] Fix for duplicate events being created in event transformation

## Version 23.06.14
Fixes:
- [cache] Fixing initialization race conditions (group store is not initialized)
- [events] Fixed % value for events trends
- [push] Fixing wrong pusher for automated messages

Enterprise fixes:
- [active_directory] Fixed bug with azure AD config change not beeing reflected in the backend.
- [drill] Fixed bug with aggregated data regeneration from granlural data to do not recreate ommited segments.
- [timeline] Optimisation for clearing out timeline data on call for clearing out older data.
- [users] Update users filter to use first session (fs)and first seen(fac)

## Version 23.06.13
Fixes:
- [core] Correctly cleanup drill meta on segment omission
- [concurrent-users] Fixed border issue in concurrent users settings
- [push] Moving token_session processing to master with an object as a debouncy buffer
- [push] Concurrent processing of several token_session requests at once
- [views] Fix for views dashboard plugin
- [star-rating] Fix rating sum error
- [dashboard] Fix user widget x axis in visualisation
- [hooks] Fix hook request json payload

Enterprise Fixes: 
- [attribution] Rename campaign properties to Campaign Platform and Campaign Browser in the drill and user profile filters
- [active-directory] Add postinstall for active directory plugin
- [okta] Add postinstall for okta plugin
- [drill] Fixed cd parameter in drill not updating properly
- [timeline] Added setting to disable recording data in timeline

## Version 23.06.12
Fixes:
- [core] Added missing space character to user profile photo description
- [core] Added script for timeline data cleanup
- [core] Created script for clearing out records without cd field in drill
- [core] Created script for rechecking merged users and retrying to finish merging
- [core] Fixed permission check
- [core] Fixed workflow for user's document on changed did
- [core] Update mongo_expireData.js script
- [hooks] invalid json in hooks is fixed
- [populator] Fixed Push notification campaign names are blank on detail page when using populator
- [push] Added ui tests
- [push] Faster deduplication on scheduling + ghost clearing job
- [push] Fixing duplicate notifications for the same token
- [push] Turning deduplication off by default

Enterprise fixes:
- [ab-testing] add fetch_experiments api
- [cognito] post install script added to congito install.js
- [retention] Fixed Cohort breakdown query on retention
  
## Version 23.06.11
Fixes:
- [crashes] Fix crash visibility filter 
- [push] Fixing wrong timeout handling for APN
  
## Version 23.06.10
Fixes:
- [core] Remove trust proxy
- [push] Fixing rescheduling delayed not-yet-scheduled messages
- [star-rating] Decoding header texts
- [views] Fix for unique value recording for segments.
- [views] Store segmentation in viewdata to correctly record uvc, bounces exits(session post items) for different segments in aggregated data.

Enterprise fixes:
- [cohorts] Correctly deal with doesn't contain rule on incoming data.
- [core] Updated tests
- [data-manager] Fixed dealing with period param on regeneration endpoint
- [surveys] Decoding feedback title
- [users] User profile session sorting descending
- [users] revert default sort in eventTable

## Version 23.06.9
Fixes:
- [push] Adding push/notifications endpoint, deprecating push/user endpoint
- [push] Docs: fixing required fields, adding example
- [core] If user property is redacted, it should not show list of values in Data manager too
- [hooks] Fix for firebase url validation

Enterprise fixes:
- [push] Allowing push token to be filtered from cohorts
- [drill] Fix table download bug
- [data-manager] Transformation - Validation for transformation failing on incoming request

## Version 23.06.8
Fixes:
- [core] Automatic license management installation script
- [core] Fixes for meta merging script
- [core] Adding automation tests to base code
- [core] Improvements for views to correctly count unique user count for one view if multiple views with the same name are sent in a single request.
- [crashes] Fix query builder option source
- [dbviewer] Fixed bug with  the filter being ignored on export if any value is null in the filter.

Enterprise fixes:
- [cohorts] Fixed pipeline for the top metric calculation to return only top 3 values, not all possible.
- [cohorts] Fixes for data fetching upon loading cohorts table
- [data-manager] Fixed a typo in the import schema function
- [data-manager] Fixes to prevent Duplicate Events due to Transform Merge
- [drill] Drill meta document conversion to type string on overflow based on document size
- [funnels] Funnel edit form does not decode funnel name on open
- [push] Fixing drill query by push token
- [push] User Profiles querying by push tokens & messages
- [push] User details rendering of push tokens present in a profile


## Version 23.06.7
Fixes:
- [consent] Fixes for user consent table
- [core] Do not track region and location if tracking city data is diabled
- [core] Fixed bug with selecting app containing special characters in dbviewer
- [core] Fixed encoding for application list
- [core] Fixed issue with session analytics showing incorrect returning users count for single day.
- [crashes] Fix query builder property types
- [db-viewer] Fixed issues with export if used query contains objectID
- [db-viewer] Fixed using correct filename in export
- [graph-notes] Fixed issue with editing graph note
- [report-manager] Fixed export table issue

Enterprise fixes:
- [cohorts] Revalidate user property rule like '7days' or '30days' in nightly job.

## Version 23.06.6
Fixes:
- [crashes] Limit custom properties key length in crashgroup
- [core] Fix issue with encoding and decoding for \u0000
- [core] Decode carriers name in carriers table
- [apps] display old salt property value too
- [db-viewer] Add search to DB Viewer apps filter and do alphabetical order
- [dashboard] Fix error in charts added in time-series type in User Analytics widgets
- [dashboard] Fix dashboard widgets showing no data incorrectly

Enterprise fixes:
- [users][drill] Correctly Match events for user timeline in user profiles
- [data-manager] Fix issue with incorrect period in regeneration of aggregate data

## Version 23.06.5
Fixes:
- [core] Fixes for pluginManager callPromisedAppMethod
- [core] Fixes for user merging
- [crashes] Add crash group check
- [report-manager] Fixes for plugin filter selector.
- [security] Dependency updates

Enterprise fixes: 
- [cohorts] fix ui bug when adding User Behavior Segmentation, the items don't fit the box.
- [flows] null check in flows job

## Version 23.06.4
Fixes:
- [ratings] Fix bug where selecting previous month returns an error
- [core] Added option to return output without encoding
- [core] Added /i/sdk path in request process
- [core] use api config on api workers
- [hooks] trigger hooks, if multiple hooks are listening to the same trigger
- [whitelabeling] localization fixes

Enterprise fixes: 
- [drill] Fix empty Drill query with empty result produces none empty table
- [drill] Fix save visualisations
- [drill] Prevent error with trying set empty string for values upon recording meta biglist data
- [ab-testing] Fix for sandboxing APIs and add new /o/sdk path support

## Version 23.06.3
Fixes:
- [core] Upgraded node version from 14 to 18 in docker images
- [core] Update ubuntu for docker to focal-1.2.0
- [star-rating] fixed the issue with downloading table data.

Enterprise fixes:
- [cohorts] Correctly validate [ab-testing] rule on incoming data
- [cohorts] Logic fix for real-time cohorts processing regarding user being in cohort + additional segmentation rule. (User could have been falling in only matching cohort rule)
- [surveys] Added option "View current target users" for the survey. Goes directly to filtered user list.

## Version 23.06.2
Fixes:
- [crashes] Update notification after sending symbolication request
- [core] Display of detailed error messages in the UI while editing app settings
- [core] Fix Users cannot login using username with uppercase
- [core] Calculation of indicator key in graph notes moved to backend
- [core] Updated geodata to newest version
- [user-management] Handle partial permission object in depCheck
- [populator] Fix URL length issue in data populator plugin's edit request
- [installer] Fix CDN download PACKAGE_NAME variable

Enterprise fixes:
- [nps] Fix for survey flickering issue
- [cohorts] Null checks for cohorts
- [crash_symbolication] Fix for JS Symbolication Timeout
- [crash_symbolication] Symbolication notification fixes
- [groups] Prevent adding global admin to a group
- [drill] Added tests and fixes for list cleanup
- [drill] Fixes for recheck_list endpoint and function
- [drill] Added script for calling list rechecking
- [views] fixes for _idv

## Version 23.06.1
Fixes:
- [core]  Added missing % in Session Analytics
- [core] Added script for report migration to bookmarks.
- [core] Fixes for mongodb configuration on install.
- [dashboards] Localization and styling fixes for empty dasboards
- [dependency] xml2js fix
- [members] Set permission._ when editing member.

Enterprise fixes:
- [cohorts] Fixes for dashboard widgets showing invalid % compared to previous period.
- [core] Fix CE tag version update
- [drill] Fix for 'Segmentation filters not showing up for cohorts'
- [drill] Store visualization type in bookmark
- [drill] default chart type is "bar" for byVal queries
- [flows] Rights check for data requests.
- [push] User Profiles querying by push tokens & messages
- [users] Fix blank value formatting

## Version 23.06

New Features:
- [app_versions] display time series data
- [dashboards] new time series type for Technology section
- [dashboards] SDK statistics widgets 
- [events] added event comparison by average duration
- [events] added search in available segments
- [events] show omitted segments
- [populator] create funnels
- [push] new push notification structure and types
- [sdk] SDK remote configuration
- [sdk] SDK statistics
- [user-management] clear failed logins for user
- [user-management] search for feature permissions

Enterprise new features:
- [ab-testing] allow customer period running tests including indefinitely
- [ab-testing] allow reseting experiments
- [ab-testing] new APIs for fetching all varians and testing varians (enrolling/leaving variants)
- [data-manager] division of data manager permissions
- [drill] enhanced state url for drill
- [drill] new drill meta structure
- [events] add drill option to Events
- [push] user profiles querying by push tokens & messages
- [surveys] different logo types
- [surveys] show always option
- [users] download user debug information
- [users] enable incoming data log for single user

Fixes:
- [crashes] clean big crash group documents
- [db] reduce timeouts to display errors
- [ratings] allow images with dot in the name

Enterprise fixes:
- [ab-testing] fix json-editor in ab-testing
- [attribution] fix safari redirect issues for custom scheme
- [cohorts] dealing with widgets for the cohort after cohort deletion
- [crash_symbolication] add logs for symbolication server connection test
- [drill] break down by date should break by dates and not seconds
- [drill] heatmap chart shouldn't limit series to 10
- [drill] hide no data text
- [drill] standartizing ls/lac behavior
- [performance-monitoring] splitting documents to be able to store more data
- [retention] backward compatibility in retention widgets

## Version 23.03.9
Fixes:
- [core] Fixes to periodObject function to deal with invalid date arrays.
- [push] Fixing tz: false with sctz: 0 case
- [user-activity] Do not export percentages in Loyalty section

Enterprise fixes:
- [drill] Fixed breakdown flter freezing issue.
- [drill] Formatted column titles for drill export
- [retention] Updated logic to do not use $facets in session retention calculation.
- [users] Fixed user properties not getting beautified in users table

## Version 23.03.8
Fixes:
- [data-manager] Fix issue with deleting event
- [push] Adding debug logging on push action
- [crashes] Get build uuid from other in crashes list if latest crash is not in crashes list

Enterprise fixes:
- [ab-testing] Allow starting experiment on experiment details page
- [ab-testing] Fix validations and error handling on experiment creation
- [data-manager] Fix description check when updating segment
- [gateway] ignore deleted app in async pull
- [funnels] Allow duplication on funnel editing
- [users] Return also lsid for users events table

## Version 23.03.7
Fixes:
- [core] Fixed backend period object code to selet buckets in same way as in frontend.
- [core] More debugging in pluginManager to see plugin install progress.
- [crashes] Update latest crash id in crashgroup even if new crash app version is the same as the last
- [views] Fixes for displaying total numbers for selected views

Enterprise fixes:
- [attribution] allowing to create campaigns with custom link
- [cohorts] Improvement to be able to deal with situations when cohort segmentation definition is stored as object (not string in database)
- [formulas] fixed average value for percent format

## Version 23.03.6
Fixes:
- [core] Destroying cache stream on error
- [core] More debugging in pluginManager to see plugin install progress.
- [crashes] Display symbolication failed/success notification
- [dbviewer] Fixed issue in aggregation view with not displaying results for drill database.
- [groups] Rebuilding member permission script
- [push] Fixes for preprocessUids parameter checking
- [push] Fixing drill query params handling
- [push] Fixing timezoned messages being filtered out for UTC- timezones when scheduled from UTC+
Enterprise fixes:
- [cohorts] On recalculate delete wrongly set hashes for user properties.
- [cohorts] Simplified processing cohorts on incoming data to recheck All cohorts.
- [crash_symbolication] Add new labels
- [crash_symbolication] Added localization
- [drill] Unescaping HTML for saved query name/description
- [surveys] fixed visual issues in popup.

## Version 23.03.5
Fixes:
- [user-management] Fix sorting for Role & Group in user management
- [user-management] Fix for blank group values
- [core] Prepare minification for all plugins
- [core] Reset permission properly in user edit drawer
- [core] Update app details response to check permission object when listing app admins and users
- [core] Sum showing up in Events breakdown that has only Count
- [push] Fixes regarding push delivery in users’ timezones
- [push] Drill filter for push action event 

Enterprise fixes:
- [surveys] Fix nps/ias popups not working in firefox
- [push] Drill filter for push action event
- [groups] Fix member permission updates when a group is deleted or updated
- [cohorts] Fixed issues with determining rules for numeric properties in realtime cohort processing.

## Version 23.03.4
Fixes:
- [core] Allow user with admin rights to modify graph notes.
- [core] Changes to remove last segment from omitted_segments in case where it is removed from data manager
- [core] Enable updating apps by app admin
- [core] Fixed api responses for app user export
- [crashes] allow providing custom regexes for stacktrace processing
- [hooks] Updated localization
- [views] Bugfix for: Views duration is counted double sometimes in aggregated data when there are multiple views in same request.

## Version 23.03.3
Fixes:
- [docker] Update default plugin list for docker install
- [docker] more lean images
- [docker] faster pod startup time
- [core] Fix default main transport
- [crashes] Enable filtering crashgroup by latest app version
- [crashes] Fix issue with crash grouping not working for object hash

Enterprise fixes:
- [ab-testing] Fix issue with ab tests not getting data when using data populator
- [cohorts] Set default times value for cohorts if not set
- [retention] Fix a bug with bucket undefined for unbounded type in Retention
- [funnels] Revert changes where funnels use drill as a single source of truth
- [ad] Fix request method signature
- [cohorts] Record realtime cohorts based on current timestamp not the one passed in request. (Helps with timing issues)
- [cohorts] Added extended logging to help with debugging issues.
- [cohorts] More fixes recording incorrect counting for users falling out of cohort.
- [event-timeline] Modify API endpoint for events table to allow session _id
- [surveys] Add questions data of json type in separate columns for surveys
- [users] Change label for device ID in user profile
- [users] Display total users as full number in users profile
- [drill] Pass period range in app timezone for drill segmentation table
- [data-manager] Fix events not loading on changing status

## Version 23.03.2
Fixes:
- [core] Fixes for table export to have valid columns.
- [core] Update user and group permission when an app is deleted
- [crashes] Fix stacktrace section condition check
- [dashboards] Fixes for ustom date selection on analytics widgets
- [events] Sorting of numberic segmentation in events table

Enterprise fixes:
- [ab-testing] Fixes for real time cohort trigger on ab test.
- [cohorts] Fixes for realtime cohort recording
- [crash_symbolication] Reset symbol files when closing drawer
- [data-manager] Changing the visibility of an unplanned event
- [data-manager] Fixes for user properties drawers
- [funnels] Fixed bugs with funnel not displaying from report result.
- [surveys] Fixes to show single day  NPS graph
- [users] Fixes for displaying object type properties in users table

## Version 23.03.1
Fixes:
- [export] Fixes for app_user export to not prevent exporting if an export already exists
- [export] Fix to include headers for exporting from data for xlsx
- [events] Fix to show graph and total for negative sum values
- [core] Fix for improving tab key navigation on login screen
- [core] UI fixes for equal gaps between sections
- [core] Fixed table column headers in several places to be more user friendly
- [push] Fixing crash on no such message

Enterprise fixes:
- [nps] Fix issue for invalid graph for yearly period
- [cohorts] Fix for editing a cohort where cohortId was empty when opening the drawer

## Version 23.03
Improvements:
- [crashes] auto-refresh toggle on the Crash Overview page
- [members] case insensitive member emails
- [datepicker] various date filtering and date picker related improvements
- [dbviewer] added showing beautified collection name
- [dbviewer] added query linking to dbviewer
- [dbviewer] extended json queries to allow querying Date field through API
- [dbviewer] index information downloading
- [dependencies] new xlsx streaming library
- [events] fixed exporting columns from table
- [events] sort segment values alphabetically
- [events] support array type for event segments
- [mongodb] switched to MongoDB 6.0 as main version
- [networking] full ipv6 support
- [nodejs] switched to NodeJS 18 as main version
- [plugins] plugin toggling without restarting nodejs process
- [ui] fixed copying api key field on sidebar menu
- [ui] fixed incorrect total number in PIE graph when there are only 2 items
- [ui] show average duration for events
- [ui] store table column order settings in database

Enterprise Improvements:
- [ad] fixed Active Directory plugin fetchs the groups limited to 100 count, increased to 999
- [cohorts] can't edit cohort segments anymore, can only duplicate cohort
- [data-manager] list user property values for list big list and array types in data manager
- [drill] added Survey/NPS/Rating "Widget Name" to filters
- [drill] changes for making event segment names readable
- [drill] clean unused values for meta data
- [drill] fixes for meta regeneration to reduce used memory for this process
- [event-timeline] Improvements to speed up and use less resources on rechecking event timeline
- [funnels] improved time calculation between steps for same session funnels
- [funnels] ui improvements for display time duration for steps and longer step names
- [gateway] updated to new ui
- [license] license manager to show data about license its expiration and usage of licensed metrics
- [sessions] auto close unended sessions to properly calculate sesison durations, bounces and other post session metrics
- [surveys] changes to fix multiple questions having same id issue
- [surveys] review section
- [users] add seconds to event table in users
- [users] dynamically calculated properties like age and engagement score that are now also segmentable
- [users] expirable user properties that are removed after set period
- [users] new text indexes to include searching device id and uid

Security:
- [dbviewer] fix check for specific collection access
- [dependencies] switched from request to got providing compatability layer for existing plugins
- [dependencies] updated dependencies versions which had vulnerabilities
- [nodejs] switched to NodeJS 18 as main version, NodeJS 14 is EOL soon
- [os] added Centos/RHEL 9 and Ubuntu 22 support, deprecated Ubuntu 18, Centos/RHEL 6, 7
- [process] countly running under countly user and installing npm dependencies as countly user

## Version 22.09.19
Fixes:
- [consolidate] Fixed app settings change for consolidate plugin
- [core] Fixed default permission object creation in case user is created via API call
- [core] Fixes for 'Unknown country flag image'
- [core] Fixes for showing app image.
- [core] crypto.getRandomValues is replaced with get-random-values package
- [db-viewer] Fixed full download for aggregation result.
- [events] Show duration formatted in minutes and seconds in graph
- [push] Fixes for dealing with streaming issues
- [users] Fix for having occasional wrong Export failures with description that user is missing.

Enterprise fixes:
- [ab-testing] Workflow fixes regarding working with real-time cohorts
- [cohorts] Corrected exited user count for cases when users are exited in parallel proceses.
- [cohorts] Fixes to deal with ab-testing rules for cohorts.
- [drill] Null checks for bookmark updates
- [formulas] Allow range date picker for no-bucket case formula widget

## Version 22.09.18
Fixes:
- [users] Fix for having occasional wrong Export failures with description that user is missing.
- [push] Trimming incoming strings/urls for messages
- [push] Fix for crash on connection error
- [crashes] Fix binary images not saved correctly in crashes document
- [crashes] Fix `Show binary images` action not showing in crashgroup dropdown
- [events] Change minimum needed events for top events
- [user-management] Fix for incorrect page refresh issue
- [views] Fix for views were not recorded in cases when there is action with new view name in the same request.

Enterprise fixes:
- [ab-testing] Updated installation scripts for centos/rhel based linux
- [data-manager] Fix for changing the visibility of unplanned events
- [data-manager] Check event map before assigning values
- [users] Fix for incorrect property check during load

## Version 22.09.17
Fixes:
- [attribution] Fixed user permissions to view notes in Attribution plugin.
- [core] Added undefined checks for rights functions
- [core] Fixes for install scripts
- [core] Ingress file for baremetal/unmanaged k8 setup
- [reports] email reports unsubscribe code generation aes-256-ctr encryption replaced with aes-256-gcm
- [views] Prevent errors on empty segmentation values in views SER-590

Enterprise fixes:
- [ab-testing] Fix ab testing python38
- [data-manager] Auto enable/disable global masking setting on enabling/disabling masking.
- [data-manager] Fix drawer opening issue
- [groups] Showing correct user count in each group.
- [users] Showing in users profile only those cohorts user is currently in. 

## Version 22.09.16
Fixes:
- [dashboard] fixed incorrectly changing widgets with number visualisation
- [core] Fix decoding of special characters in ui
- [core] Fix for vulnerable password generation
- [core] Sanitize file names for localisation and themes
- [hooks] Fix calling of localhost
- [data-manager] fixed bug in category change for events
- [install] run wget without sudo during installation
- [populator] Fix for empty users created for ab-testing
- [settings] Fix for API settings missing from app level configuration

Enterprise fixes:
- [data-manager] Fix bug in changing visibility for event
- [cohorts] Fixed element sizes of cohort steps, inside cohort creation form
- [ab-testing] Change python3 to python3.8 for CentOS 8
- [ab-testing] Set default timezone for models installation scripts
- [drill] Send segmentation request as POST

## Version 22.09.15
Fixes:
- [compliance-hub] use 'change' instead of 'after' for filter
- [core] app user export to database (not using filesystem anymore) !!!changes export format!!!
- [core] do not fetch masking config if masking is not enabled
- [core] fixed parsing of special characters in event keys
- [core] only use custom period when set explicitly in model file
- [core] set activePeriod as current day in periodObject if single day selected
- [dashboards] fixed bug with not fully loaded graphs for events and crashes for some periods
- [data-manager] fixed localization for data masking toggle
- [dbviewer] correct read access check fixed
- [dbviewer] fixed server error on invalid queries
- [events] fixed display bug in the all events view for events with ampersand in its name enterprise
- [install] do not overwrite supervisord.conf in upgrades
- [install] online and offline setups for CentOS/RHEL 7
- [networking] support for ipv6
- [period] end date was set as 00:00Am in custom period selections
- [populator] added UI check for maximum time input that prevents non-number inputs
- [populator] populating with template create SDK requests with template document properties
- [push] fixed wrong error deserialization
- [security] deepExtend manual object copy replaced with lodash merge
- [security] jquery validation xss vulnerability fix
- [UI] graph notes back link is fixed

Enterprise fixes:
- [ab-testing] Fixes for setup.
- [active-directory] Remove tlsKey for active directory  client
- [cohorts] Fixes for displaying special characters
- [data-manager] Ability to mask device id
- [data-manager] [users]  Fixes for & in events name
- [drill] Added index on eventTimeline collection for field app to have faster deletion on app delete/clear.
- [drill] Fixed bug in timeline on single event deletion.
- [drill] Make sure only preset values are used in meta regeneration and no new values are added.
- [drill] Meta cleanup endpoint and function in drill. Clears out wrongly saved infromation in meta about user properties.
- [retention] Fixes for showing cohort names in retention view.
- [retention] Retention label set according to selected result type.
- [revenue] Null check for revenue widgets
- [users]  Fixes for displaying special characters
- [users] sidebar properties value change after page has loaded

## Version 22.09.14
Fixes:
- [core] Always use random initialization vector if not provided for encryption
- [core] Fix incorrect changing of platform to Windows Phone 10 for Windows 10 
- [dashboards] Fix incorrect data & fluctations of visualisation in analytics widgets

Enterprise fixes:
- [attribution] express-user-agent npm module replaced with ua-parser-js
- [drill] Adding ability to pass additional ids for views and events tracking
- [retention] Fix for cohort queries not working in retention breakdown
- [ldap] Allow enabling of disabling tls
- [active_directory] Pass tlsOptions to active directory when tls is enabled
- [data-manager] Remove unnecessary loading of big lists into memory
- [funnels] Fix Last update time not shown for cached funnels
- [okta] Update version for got dependency

## Version 22.09.13
Fixes:
- [compliance-hub] Fix consent history filter
- [core] Fixes for dashboard date picker in for different timezones
- [core] Fixes to correctly select single day in date picker
- [core] Improve permission check in member drawer
- [remote-config] changes for remote config invalid condition scenario
- [server-stats] Fixed localization
- [star-ratings] Fixed issue with submit button

Enterprise fixes:
- [cohort] Prevent errors in segmentation filter in case of invalid cohort name.
- [data-manager] Fix for Invalid values on opening form when editing transformation with regexp in data manager

## Version 22.09.12
Fixes:
- [core] fix for users with appListSort
- [crashes] smart stack preprocessing to remove dynamic content
- [report-manager] Prevent server crashing on invalid comment value upon saving long task

Enterprise fixes:
- [crash_symbolication] display symbolicate option for javascript stacktraces
- [drill] do not call sorting function on cohorts. (As it is object, not array )
- [drill] Fix bug with not loading values in query builder for custom properties
- [drill] prevent server error if for segmentation calculation are passed values, which are not type is not string
- [funnels] time between steps is ofsetted

## Version 22.09.11
Fixes:
- [compliance-hub] Fixes for table export.
- [core] Local table export improvements to allow sorting. 
- [data-manager] Fixes for event transformation drawer.
- [dbviewer] Storing aggregation pipeline results in reports if they take long to calculate.
- [plugins] Update internal-events endpoint access right
- [push] App filter for consent removal
- [push] Better network error handling, less batching logging, moving timeout checks to mongo stream
- [push] Proper error message and scheduling for no audience case
- [push] Sending approval emails again on message edits, leaving submitted props on edits
- [report manager] Improved filtering of reports to allow filter by App and owner.
- [views] Correct path usage in dashboard to prevent errors in case countly  root is in subfolder.

Enterprise fixes:
- [ab-testing] AB testing bayesian models compilation fixed
- [attribution] Fixed issues with invalid url after edit
- [attribution] Fixes for platform recording 
- [cohorts] Bugfix for cohort data merging on user merge.
- [cohorts] Fixed issues for realtime cohort update on requests with only user properties
- [concurrent-users] Number visualization widget
- [data-manager] Fixes for biglist handling on install
- [data-manager] User property handling fixes
- [drill] Improved cohort filtering in query builder
- [flows] Fixed issue with resetting settings on install
- [flows] Valid range selection on calculating flows
- [oidc] allow provide custom text for Login button
- [oidc] make sure email is lower case
- [oidc] precreate config file on install, if it does not exist
- [push_approver] Allowing global admin approvers to be notified about messages
- [users] not showing exported filename path in exported file.


## Version 22.09.10
Fixes:
- [logger] removing potentially sensitive info from headers
- [settings] small fixes to search in settings
- [ui] table export column titles are not user friendly

Enterprise fixes:
- [attribution] added typo control for platform when parsing user-agent parameters. 
- [data-manager] invalid values on opening form when editing transformation with regexp in data-manager
- [oidc] add same site cookie fallback
- [oidc] generate password moved to common
- [surveys] completed_surveys uses _id field, not uid field

## Version 22.09.9
Fixes:
- [applications] prevent used app_key in front and back end
- [crashes] rename bi to bn
- [crashes] use real session as fallback in crash stats
- [push] logging crashing issue

Enterprise fixes:
- [ab-testing] add Ubuntu 22 support and remove CentOS 6 support on AB testing

## Version 22.09.8
Fixes:
- [dashboards] date picker doesn't fit into the view in dashboards
- [dashboards] fixed date formats for monthly selection in widgets
- [dashboards] provided chart refresh after changing time bucket for specific widgets
- [hooks] configurable rate limiter for hooks implemented
- [hooks] sanitize email HTML input
- [push] streaming timeouts handling
- [render] added configurationsView checks not to break server side rendering
- [settings] search in settings

Enterprise fixes:
- [cohorts] improved speed for loading cohort widgets in dashboards
- [data-manager] fixed for missing data type in user props
- [data-manager] fixed user properties sort 
- [drill] adding stringified Drill query to the export file name
- [funnels] fixed for false error ouptut in logs if funnels dashboard widget does not have filter query
- [push_approver] correct members query
- [revenue] fixed revenue widgets metric selection
- [users] fixed user profiles consent table export exports ALL users, not only this one
- [users] change format for numbers in user profiles

## Version 22.09.7
Fixes:
- [api] added try catch block to regex
- [core] increasing runners timeouts + bug fixes
- [countries] fixed data display on tooltip
- [countries] Home > Countries data is missing after navigation
- [crashes] format binary images in new way
- [crashes] show binary image name from new format
- [dashboars] added required libraries for puppeteer
- [dbviewer] preventing crash if array passed as filter to dbviewer
- [hooks] error handling fixes
- [longtask] error message added for delete button
- [plugins] remove plugin upload
- [prelogin] filter error messages
- [push] correct app id when fetching test users cohorts
- [push] missing indexes for token hashes
- [ui] replaces merge with mergeWith for every chart
- [users] added a check for application admin to have correct rights
- [views] fixed u value estimation when viewing 'selected views' table in analytics/views

Enterprise fixes:
- [ab-testing] update python shell version
- [active-users] fixed the issue where the data was broken if the selected period time was yesterday or yesterday
- [cohorts] added "my cohorts" option and changed filtering to a dropdown
- [cohorts] added cohort update on incoming user properties
- [cohorts] added Recalculate cohort button in cohort view
- [cohorts] added trigger to swich states for cohorts dependant on other cohorts
- [cohorts] code optimisation and more tests
- [cohorts] fixed bug with hashes not clearing out on cohort deletion
- [cohorts] fixed case when user coming in/out of saame cohort in single iteration
- [cohorts] fixed code to properly deal with definition for user properties nested under $and, $or
- [cohorts] optimize realtime cohort update queries for sharded cluster
- [cohorts] remove favorite number
- [crash_symbolication] convert binary images to new format before sending
- [crash_symbolication] fixed symbol file uploader
- [crash_symbolication] symbolicate javascript stack trace types
- [users] display date type based on meta type and nested values based on timeline
- [users] fixed for user property data type change
- [users] fixed segment not loaded after refresh
- [users] number formatting in user profile

## Version 22.09.6
Fixes:
- [crashes] there can be binaries with same name, but different addresses
- [dashboards] fixed unable to change data type for analytics widget on EDIT
- [dashboards] changed date picker placement to bottom end
- [push] fixed wrong reset type handling

Enterprise fixes:
- [active_users] improved precision for MAU
- [crash_symbolication] bump version if there is new binary_images model
- [funnels] creator added to funnel and displayed with creation time and last updated
- [funnels] removed last updated, added style, displayed special characters in funnel name
- [users] display nested objects correctly

## Version 22.09.5
Fixes:
- [compliance-hub] localization bugfix for compliance hub
- [country] fixed handle undefined country data
- [crashes] add log and return failed crash deletion
- [crashes] clear selection after deletion or hiding
- [crashes] multiple crash deletion fix
- [crashes] remove crashgroup row click handler
- [crashes] show alert for failed operations
- [dashboards] unnecessary scrollbar on old widgets
- [db] wrap bulkWrite operation for debug
- [export] allow passing format to stream function for dates when exporting
- [member-utility] prevent modify immutable field
- [pdf] moved to pure puppeteer for pdf generation
- [push] correct send now date for drafts
- [push] remove device tokens on user removals and consents
- [push] respecting rate limit
- [push] switching to old request method because of outdated puppeteer monkey patching
- [remote-config] fixed data passed to audit log
- [remote-config] object check for json
- [views] fix for views to return also value 'u' for period 'day' event if it matches uvalue
- [views] fixed incorrect total view count for "this year" period

Enterprise Fixes:
- [active-users] active Users table date column formatting
- [attribution] fixed error in attribution plugin
- [concurrent_users] null check before registering labels in configuration view for concurrent users
- [drill] fixed export downloads empty file, fixed period param for passing
- [drill] fixed unescaped characters from chart's legend and querybuilder
- [ldap] log error on ldap client error instead of throwing exception
- [retention] cohort based breakdown in Retention doesn't show the cohort names
- [retention] minor visual issues fixed in the Retention view
- [user-management] make group names in user list clickable
## Version 22.09.4
Fixes:
- [api] respond 200 on ignore of device_id
- [dashboards] change width for dashboard report
- [dependencies] html-pdf replaced with pdf-puppeteer
- [dependencies] replaced external ip module with icanhazip
- [export] adding timeout in export to prevent stream closed, cannot push to
- [menu] update Applications and Settings menu item position
- [push] empty error message for expired iOS tokens
- [push] leaving push history on push api-consent removal
- [star-rating] added null check
- [star-rating] changes for star-rating refresh issue
- [star-rating] percentage fix
- [ui] ui fixes not using :has operator

Enterprise Fixes:
- [cohorts] fixes for realtime cohort in case of multiple ORs
- [cohorts] null check and validation on unexpected data from db
- [dashboards] removed info about decimal points for fotmula widget
- [dashboards] showing correct period for buckets week and month for drill and formula
- [dashboards] showing values on widgets even if range is smaller than bucket for drill and formula
- [data-manager] null check fix
- [data-manager] reduces i18n call
- [formulas] visual fix for formulas dashboard widget

## Version 22.09.3

Fixes:
- [applications] admin of app should be able to change settings to app in app managament view
- [dbviewer] allow filtering collections by apps
- [compliance-hub] fixed compliance hub ecport/purge issue
- [core] activate selectedMode option for custom legend component
- [crashes] modify exists queries to get correct result from db
- [crashes] set crashgroup name as proper link
- [crashes] store javascript property too
- [dashboards] fixed legend issue
- [dashboards] increases z-index and always showing scrollbar
- [data-manager] fixes event sort by category
- [data-migration] exporting also eventTimeline collection in data migration
- [export] fixed export custom filename issue
- [longtasks] do not record failure to create operation id as error in taskmanager
- [period] DST fix, where we might have 30 days and 1 hour, or 29 days and 23 hours between 2 dates
- [render] revert puppeteer dependency as new one installs chromium in user folder, which is not always accessible
- [scripts] script for deleting members, which have not logged in for some time
- [star-rating] fixed data is loaded when rating widget selected
- [star-rating] fixed undefined numbers
- [upgrade] update batch size for merge apm query

Enterprise fixes:
- [attribution] attribution save default URL issue
- [cohorts] bugfixes for realtime cohorts
- [concurrent_users] upsert command fixed
- [data-manager] fixes data manager->Segmentation sorting
- [data-manager] transformations sorting
- [drill] null checks for loading drill widget data
- [formulas] added recalculation button + showing last time data was recalculated
- [formulas] fixed issue with cases when more than one report created for single bucket
- [formulas] some old widgets have dplaces stored as string. Workaround for it.
- [formulas] some widget have invalid value for buckets. Catching those and calling correct report creation
- [revenue] fixes in the dashboard widget
- [revenue] sorting bugs field in revenue table

## Version 22.09.2

Fixes:
- [applications] cleaning up checksum_salt on update, showing value on fetch
- [crashes] fixed negated trend handling of the crashes home widget
- [dashboards] fixed too small graph widgets
- [dashboards] overflow of text in notes fixed
- [dashboards] show latest update date for report manager widgets
- [data-manager] fixed description column
- [device_list] added latest Apple devices
- [devices] app version series legend was missing
- [docker] dependencies for puppeteer
- [export] fixed using export file name
- [logger] convertToCap only when needed
- [logger] Incoming Data Logs datatable sorting change
- [overview] fixed ordering of home widgets doesn't work in CE
- [remote-config] removed programmatic audit report
- [report-manager] taskmanager calling directly using processRequest on task rerun
- [settings] disable city data tracking when country is disabled
- [slipping-away-users] hide user button in CE
- [slipping-away-users] table width arranged
- [star-rating] fixes sorting on rating table
- [two-factor-auth] fix permission call in two factor auth
- [views] fixed bounce rate average in graph


Enterprise fixes:
- [cohorts] query transformation and operation limit fixed
- [crashes-jira] create jira button bugfix
- [drill] add 'recalculate' button for drill widgets
- [drill] fixes for dashboard widgets
- [drill] fixes for event timeline
- [drill] showing last updated on drill widgets
- [formulas] bucket fixes for formulas
- [formulas] fixes for dashboard widgets
- [funnels] did not do first step user list
- [revenue] dashboard widget for revenue
- [revenue] fixed sorting columns

## Version 22.09.1

Fixes:
- [2fa] fix permission call in two factor auth
- [api] remove duplicate code and process device type correctly
- [api] top events check fixes
- [apps] app lock tooltip text fixed and localized
- [apps] app management sidebar app icon margin alignment
- [crashes] fixes new crash dispatch
- [crashes] use common styles for the tab element
- [dashboards] note in dashboards escaping fixed 
- [device-list] add missing Apple devices
- [events] check for existience of map key in overview
- [hooks] fix app filter for new crashes
- [hooks] fixes for data formatting
- [members] update default profile image sprite
- [push] fixing ampersand encoding in button URLs & on click URL
- [scripts] fixes for expire scripts to do not drop indexes on ttl change, but rather modifly value
- [server-stats] fixed issues with incorrectly calculated data points for periods: "month", "day"
- [settings] country data tracking can be disabled
- [ui] cly-vue-radio-block - use common trend styles
- [ui] common styles for the tab element & trend up, down, neutral and negated states
- [ui] fixes for datepickers, who uses second not milisecond format
- [ui] prevent map zoom via scroll wheel
- [ui] remove spaces before % throughout the dashboard
- [ui] set drawer element z-index for it to be above the table loading mask
- [ui] vertically center some no-data elements in Analytics > Technology
- [upgrade] fix stopping on error
- [upgrade] improvement for upgrade script to do parallel upgrade for collection

Enterprise fixes:
- [attribution] use common styles for the tab element & use correct trend values
- [cohorts] in mongo update $pull And $push CANT be in same call!!
- [cohorts] period selection fixes
- [concurrent_users] online users home widget max numbers margin alignment
- [data-manager] fix for status update not showing up
- [data-manager] fix projections for data masking
- [drill] fix time formatter
- [drill] update duration on each session duration change
- [formulas] pass [CLY]_session as default if none of events is set. To have duration in query builder after
- [groups] check for empty group permission when creating permission set in drawer
- [groups] fix groupID in group drawer
- [retention] fix in case of undefined parameter
- [revenue] use common styles for the tab element

## Version 22.09

Fixes:
- [apps] app icon change doesn't take effect until clear cache
- [apps] app management Reset & Delete buttons broken hover state
- [apps] fix salt
- [apps] fixed app icon file selection stays the same after switching to another app
- [crashes] get app version from vuex correctly
- [dashboards] fix for widgets with since time period
- [logger] fixed header tab overflow
- [push] fixing ampersand encoding in message URLs
- [ui] datepicker fixes
- [ui] search mixin fixes when value is not string
- [views] fixed displaying users when period is whole year like 2022

Improvements:
- [data-manager] update localization add property name and type
- [logger] collapsable json data
- [plugins] removed plugin version column from feature management
- [security] improved image valdiation
- [security] remove api_keys from requests
- [security] update dependencies

Enterprise fixes:
- [data-manager] fix export for data manager schema
- [data-manager] remove data type tooltip from regenerate drawer
- [data-manager] replace user properties column label with localization
- [drill] localization key updated for View Segments
- [flows] period editing bug fix. +added code to deal with messed up period fields
- [flows] using $substrCP instead of $substr to do not run into problems with special characters
- [retention_segments] breakdown tooltip removed

Enterprise improvements:
- [cohorts] added date control for custom datepicker in Cohort
- [cohorts] real time optimzied cohort generation
- [drill] meta regeneration improvements for speed and user properties
- [performance-monitoring] merge all collections into single apme collection
- [revenue] add currency field
- [surveys] set a new endpoint for retrieving rating widget data
- [users] make name exportable in user profiles

## Version 22.08.6

Fixes:
- [2fa] permission fix
- [apps] admin of APP should be able to edit image for app
- [batcher] fix cases when data might still be read from cache even if the cache is disabled
- [core] env variables in tests
- [dbviewer] fixes in dbviewer aggregation pipeline
- [events] fixed . usage in events for some cases
- [logger] change display name of Request Logs to Incoming Data Logs 
- [push] allowing editing created messages
- [push] correct formatting for sent number in messages table
- [push] fixes for user merging
- [push] fixing clear job
- [push] fixing errors on push data removals
- [push] more message transferring logging
- [push] removing double message update
- [remote-config] changes to make remote-config params non editable if they are not completed in ab-test
- [remote-config] fix expire for remote config
- [ui] add margin top to settings override warning
- [ui] in dropdowns the scroll bar is not shown by default
- [ui] make app management delete/clear confirmation buttons red
- [ui] multiple localization fixes

Enterprise fixes:
- [active-directory] azure AD multi tenancy support

## Version 22.08.5

Fixes:
- [apps] admin of app should be able to edit image for app
- [apps] fixed newly created app is locked
- [user-management] fixed group name display if user group_id is not an array
- [crashes] remove os from indexed props in query builder

Enterprise fixes:
- [ab-testing] changes for new endpoint in ab testing
- [groups] added checking for user group_id, it has to be an array
- [drill] added undefined check for _idv parameter

## Version 22.08.4

Fixes:
- [config] fixed web configs for config extender
- [core] fixed user picture condition check in user deletion
- [core] prevent app user deletion if there is an error from other plugins
- [db] fixed config variables for docker for different databases
- [events] fixed encoding decoding issue in events
- [linting] fixed codeql issues
- [logger] add debug logs to request logs
- [populator] add more demo pages with links
- [push] reschedule on edits
- [scripts] fixed one liner installer script
- [star-rating] changes for ratings images in countlyFS
- [ui] in dropdowns the scroll bar is not shown by default
- [views] add support for handling SDK provided ids for views
- [views] fixed heatmap top bar check mark

Enterprise fixes:
- [ab-testing] add link click handler for metric breakdown
- [ab-testing] remove target blank from link in metric breakdown
- [active-users] fixed to stop timeout on active users job exit
- [active-users] fixed wrong active user/visitor data
- [cognito] implement cognito authorization code flow
- [concurrent_users] added isNaN control where max item is displayed
- [crash_symbolication] call return connection test from dashboard
- [crash_symbolication] enable platform and status filter
- [crash_symbolication] fixed crashgroup symbol_id passing
- [crash_symbolication] fixed symbol jobs
- [ldap] expose configs in docker
- [surveys] fixed bar colors on nps chart
- [users] add backlink to index view header

## Version 22.08.3

Fixes:
- [api] fix bug with new apps and salt, when requests are not rejected
- [applciations] if there is an app key, a new one should not be produced
- [applications] will not be able to edit any Application to have an empty name
- [crashes] pass symbol id from crashgroup for symbolication
- [dbviewer] refresh of all data when changing the collection
- [events] fixes for encoding decoding issues in events overview and details page
- [logger] showing if request is cancelled in logger
- [populator] add multiple heatmap examples
- [populator] cleanup duplicate code in populator
- [populator] populator templates datatable's alignment issue
- [ratings] backward compatibility fixes for emoticons

Enterprise Fixes:
- [block] fixed filtering rule saving issue
- [cohorts] fixed home table alignment issue for Safari browser


## Version 22.08.2
Features:
- [core] script to remove old permission properties
- [crashes] Fix binary image symbol id check
- [crashes] Fix build uuid check for latest crash
- [crashes] Fix fetch symbols response
- [crashes] Prefill symbol drawer called from binary page
- [crashes] Unescape binary page crash name
- [push] fixed arraybuffer crash
- [push] Fixing wrong reporting of retriable errors
- [push] Mark message as streamable before scheduling starts

Enterprise features:
- [crash_symbolication] Fixed symbol drawer
- [crash_symbolication] Show uploaded file in symbol drawer
- [crash_symbolication] Update symbol file validation
- [surveys] removed usage of formatNumber when passing to metric cards as a prop
- [users] Fixed bug with downloading user export if it went to report manager
- [users] when loading user profile page, check data and show active "export download" button if there is existing export for this user

## Version 22.08.1
Fixes:
- [crashes] Add crashgroup toggle symbolication switch
- [crashes] Display threads in crashgroup view
- [crashes] Fix crashgroup refresh action
- [crashes] Fix crashgroup symbolicate action
- [crashes] Fix show symbolication switch
- [crashes] Improve crash group datatable expansion handler
- [crashes] Move datatable row stacktrace actions to dropdown menu
- [crashes] Move stacktrace actions to dropdown menu
- [db] provide different configs for different databases through ENV variables
- [populator] udpated data for populator
- [report-manager] correctly handle case when admin permissions are not given
- [star-rating] changes for adding time in excel for ratings
- [star-rating] emojis backward compatibility fix for ratings
- [star-rating] logo preview dimensions adjusted

Enterprise fixes:
- [crash_symbolication] Fix symbold build id checking
- [crash_symbolication] Update symbolication switch text
- [drill] use random function that is fully supported in nodejs 14
- [oidc] additionally store check in coookie to fallback if session expires

## Version 22.08

Fixes:
- [core] fix member image endpoint, replace session id with member id
- [dashboards] fixed user overview shows same 'number' for total, returning and new.
- [push] logging sender crashes
- [push] removing EE dependencies from CE
- [star-rating] fix for platform and app version
- [ui] color mismatch is fixed between legend and chart line in multi-legends as chart data changes
- [ui] improvement of selected tab on multiline select element

Features:
- [long-tasks] allowing to kill long tasks on DB side
- [push] allowing on-event auto push in CE

Enterprise fixes:
- [ab-testing] improved detail page
- [cohorts] fixing special period handling
- [config-transfer] fixed dashboards export
- [data-manager] Fix transform event drawer regex input
- [funnels] changes for funnel datepicker
- [gateway_processor] fixed processing on error
- [gateway_processor] localization and menu fixes for new UI
- [group] fixes for ui
- [surveys] fixed total responses NaN
- [users] refresh user details page

Enterprise features:
- [data-manager] data redacting for user properties
- [oidc] work with new permissions
- [retention_segments] breakdown by segments
- [revenue] revenue widget for the custom dashboard
- [users] breakdown of users by segments

## Version 22.06.5

Fixes:
- [crashes] fix number of occurences on crash details page
- [crashes] remove $natural sorting from app_crashes query
- [date-picker] fixed the date constraint that does not include the last day
- [docker] bundle lates geoip lite db with each image
- [docker] install mongoexport for user exporting
- [mongodb] Backwards compability for depricated .save()
- [pre-login] add success notification
- [push] Adding connection settings for push plugin
- [push] fixes for push table
- [push] Fixing styling issues
- [push] Logging current configuration in the sender
- [push] Safer pushes limit
- [server-stats] Change text from Deleted app to not available
- [star-rating] fixed displaying logo
- [ui] Always show search in datatable column filter
- [ui] Fix select x hidden header condition
- [ui] Fix select x max items check
- [user-management] do not validate member image flag
- [user-management] Fix user global admin value in user drawer
- [user-management] Fix user permission value in user drawer
- [user-management] Make sure that groups in user drawer is an array

## Version 22.06.4

Fixes:
- [core] disable select x options when max items is reached
- [core] new eslint
- [longtasks] added stopping feature for long running tasks
- [plugins] handle install error differently
- [push] Missing app_id parameter validation for tx messages
- [push] change push messages table to server side table
- [push] various fixes, back to safe mode
- [times-of-day] fixed day names

Enterprise fixes:
- [ldap] added optional group DN in sample config

## Version 22.06.3
Rebuild of 22.06.2 with correct sync of repos

## Version 22.06.2

Fixes:
- [core] remove select-x dropdown gradient if there is no tab or search
- [docker] load cities and plugin list updates
- [metrics] fix Linux Arch os reporting
- [server-stats] fixed commandline reporting
- [star-rating] fix texts
- [star-rating] fixed checkbox bugs in rating

Enterprise fixes:
- [gateway] use parallel transform
- [surveys] changes for exclusive options to deselect other if exclusive options are selected
- [surveys] changes to remove all of above for radio button

## Version 22.06.1

Fixes:
- [db] old option fixes for native_parser
- [events] add tooltips to the monitored event charts
- [push] Weird streaming issue
- [push] Wrong data path for silent messages in Android
- [push] proxy support
- [slipping-away-users] fixing api call without query option
- [ui] add searching for dropdown selectors
- [user-management] fixed groupModel check

Enterprise fixes:
- [crash_symbolication] fix return_url for symoblication

## Version 22.06

Fixes:
- [compare] correctly respond to core events
- [dashboards] add more rows and columns
- [dashboards] do not close dashboard sidebar if drawer is open
- [dashboards] send emails on dashboard invites
- [data-migration] make export path non mandatory field in data migration
- [dbviewer] fixed for export with query
- [jobs] back button doesn't work
- [menu] stay on same view after page refresh
- [mongodb] driver update
- [push] fixing capping display
- [push] following redirects for mime
- [push] new proxy logic
- [star-rating] fixed preview screen for ratings
- [ui] 31 day month period is cut off in graphs
- [ui] chart label orientation fixes
- [user-management] fix reset filter button style

Enterprise fixes:
- [cognito] create config file on plugin install, if it does not exist
- [concurrent_users] Max online user values should be resettable from an app level configuration
- [config-transfer] fix for blank names
- [drill] drill widget should skip x-axis labels like other time series graphs
- [funnels] Ability to duplicate funnels
- [groups] manage user group assignment directly from group management
- [retention_segments] add column sizes for 13 months and 30 days retention tables for dashboards
- [retention_segments] fix retention table tooltips

## Version 22.03.12

Fixes:
- [UI] Custom file name for export functionality in the datatable
- [dashboards] Subheading and label prop in the select app component
- [jobs] More rescheduling attempts
- [push] Adding lastRuns
- [push] Adding too late to send error
- [push] Filtering messages by status
- [push] Variables for API messages
- [push] Waiting for connect promise to resolve
- [systemlogs] Make sure we store correct MongoDB documents
- [user-management] Apply filter when reset filter button is clicked
- [user-management] Set filter dropdown width

Enterprise fixes:
- [cohorts] Cohort name is not editable after creation
- [cohorts] Cohorts aren't sortable in "Current Users" column
- [concurrent_users] Don't show period in online users widget
- [concurrent_users] Max online user values should be resettable from an app level configuration
- [concurrent_users] x-Axis labels of this online users graph on dashboards horizontally
- [config-transfer] Config transfer supports Fitlering rules
- [drill] Make default visualization 'Bar Chart' if query contains BY in Drill
- [drill] When exporting BY query table result in drill to excel file, key column is empty
- [formulas] Expression value checks for copy formulas
- [users] Decode event name in userprofile event timeline section

## Version 22.03.11

Fixes:
- [applications] update application details values when dropdown is open
- [compliance-hub] Full row click to open row
- [data-manager] Add view regeneration to data manager regenerate drawer
- [date] Correct period for ndays
- [dbviewer] Full row click to open row
- [device_list] updated device list from model to name
- [geo] Correct user estimation for totals
- [logger] Full row click to open row
- [remote-config] Full row click to open row
- [sessions] Display total users as unique sessions
- [sources] Full row click to open row
- [star-rating] Fix displaying chart data
- [systemlogs] Full row click to open row
- [ui] Added warning type to the dialog box
- [ui] Localization fixes
- [user-management] Added role/group filter
- [user-management] Display group name in table
- [user-management] Display group name in table

Enterprise Fixes:
- [cognito] Add attribution plugin to docker build
- [drill] Passing period correctly if BYVAL + custom period
- [drill] Regenerating views from granular data
- [formulas] Bucket array check
- [users] Fixed for general cohort based query in export users
- [users] Fixed user table export only exports filtered users

## Version 22.03.10

Fixes:
- [dashboards] The graph tooltip should overflow from the widget's bounding box
- [push] Expired credentials case
- [ui] Pressing enter refreshes the page

Enterprise fixes:
- [auth_plugins] Remove old UI artifacts
- [drill] View regeneration from drill data
- [surveys] Fixed tooltip localization

## Version 22.03.9

Fixes:
- [batcher] more no fallback errors
- [compliance-hub] Table column design fix
- [push] Arrays for sent messages
- [push] Method to get notifications sent to a particular user
- [push] Missing audit logs calls
- [push] Missing capping / sleeping support
- [push] Parsing only string args for legacy api
- [push] Set test pushes as prod in upgrade script
- [ui] Chart label scaling issue fixed
- [versions] Showing mongodb version in versions view
- [views] Using isoWeek for unique views values

Enterprise Fixes:
- [ab-testing] fix of undefined array
- [attribution] Added null check for unpopulated data case
- [attribution] Fixed the issue where metadata was not displayed in segments
- [users] Always translate surveys
- [users] Fix for sorting session table
- [users] Handled formating case for numbers
- [users] Missing tooltip added
- [users] Optimize calculating event count for session for single user in aggregation pipeline
- [white-labeling] Default button color code changed

## Version 22.03.8

Fixes:
- [dependency] update dependencies
- [ui] fixed scaling issues and x-axis labels on charts
- [ui] tab title should update when switching app types

Enterprise fixes:
- [crashes-jira] new UI integration
- [funnels] save button's label changed for edit case.
- [retention_segments] fixed retention filter query
- [users] fixed export query
- [users] fixed query bookmark

## Version 22.03.7

Fixes:
- [compare] Adding tests
- [members] Secure password reset token generation
- [push] Allowing no platform results for migrated messages
- [push] Migrating messages in batches
- [remote-config] Fix for percentage bars
- [upgrade] Remove even more files
- [views] Fix view regeneration

Enterprise fixes:
- [flows] ui fix

## Version 22.03.6

Fixes:
- [compare] loading state fix
- [ui] X-axis overflow handling changes
- [upgrade] add drill indexes
- [upgrade] do not upgrade new users that have permission object

Fixes Enterprise:
- [attribution] added information toast when clicked show/hide button
- [surveys] handling appearance null cases for sdk api
- [users] add engagement score

## Version 22.03.5

Fixes:

- [core] Fixing logging issues
- [crashes] Fixed app_version filter
- [dashboards] Add dashboard name to audit logs when widget deleted
- [dashboards] Show that app is deleted in widgets if app was deleted
- [docker] Fixed dependency for HTML PDF on centos images
- [grunt] Fixed production mode
- [push] Destroy connection on credentials validation failure
- [push] Fixing change streams in sender until driver update
- [push] Longer muticasts
- [push] Self signed proxy certificate support
- [star-rating] Added custom rating symbol support

## Version 22.03.4

Fixes:
- [push] added missing files

## Version 22.03.3

Fixes:
- [crashes] defaults for optional fields
- [dashboards] custom period for events widget
- [dbviewer] fixed exporting of other databases
- [frontend] fixed sorting of analytics tables
- [populator] add push events
- [push] credential validation fixes
- [push] logger fixes
- [push] remove send job
- [report-manager] fixed localization strings

Enterprise Fixes:
- [attribution] new ui transition
- [drill] allow storing objects/arrays in event segments
- [flows] correct view name mapping if start and end point selected for flow
- [revenue] average paying customer data fixes and css improvement
- [surveys] fix to show logo preview
- [users] fixed decoding properties in user profiles

## Version 22.03.2

Fixes:
- [crashes] fixed chart color
- [crashes] fixed crashes stats
- [populator] added control when input has a comma
- [push] Revert "delete unsued preview push images" 
- [push] fixes in upgrade script
- [push] making sure audience pusher works if there's no token
- [push] proxy support, better configs & lots of fixes

Enterprise fixes:
- [ab-testing] fixes for detail page to show variants
- [revenue] session data included in the countly revenue
- [surveys] changes to show device id if userName not present
- [surveys] changes to show logo on edit
- [surveys] fixed logo deletion

## Version 22.03.1

Enterprise fixes
- [attribution] remove unfilled placeholders from postback url
- [crash_symbolication] add testing symbolciation connection back
- [drill] Query builder datepicker overflow fix
- [drill] localization fixes
- [event-timeline] deleting views and crashes from timeline on view or crash delete
- [funnels] filter button fixed for multiple events
- [geo] fixed accessing from non-mobile app error
- [revenue] revenue data inconsistency removed

Fixes:
- [core] added control for no data case
- [core] fix: renamed wrong file names in gruntfile for production mode
- [data-migration] fixed for redirect link
- [events] changes for date sort in events
- [hooks] update vuex state
- [populator] localization fixes
- [push] Adding missing FCM error codes localisation
- [push] Broken backwards compatibility with test tokens for FCM
- [push] Credentials migration fixes
- [push] Fixing no audience for test users
- [push] Legacy API fixes
- [push] New huawei API
- [push] fetch dashboard information once
- [push] hide/display number of users on review step based on audience
- [push] mutable-content for buttons
- [scripts] fixed Compiler Version for 22.03 upgrade and installation
- [upgrade] remove old files

## Version 21.11.4

Fixes:
- [members] Secure password reset token generation

## Version 21.11.3

Eneterprise Fixes:
- [surveys] fix for salt check
- [cohorts] fixes for cohort metric calculation
- [crashes] post processing meta results and removed from query

## Version 21.11.2

Fixes:
- [core] update login time on external auth plugins
- [hooks] use different sandbox for custom step
- [package] colors dependency fix
- [push] fix fetching by id
- [scripts] centos 7 fix for python3

Eneterprise:
- [retention] fixed warning for namespace not existing
- [survey] added tags option in nps and surverys
- [surveys] added extension check to surveys file upload

## Version 21.11.1

- [push] removing TLS override

## Version 21.11.0

* Adding Custom Dashboards plugin
* Adding Hooks plugin
* Adding Recaptcha plugin
* Adding Remote Config plugin

## Version 20.11.2.14

Fixes:
- [cmd] use new hash for user management 
- [frontend] Discard the first week in ticks if it is the 7th day
- [populator] styling fix for CE
- [push] no personalisation in CE fix

Features:
- [crashes] dispatch event on new crashes
- [systemlogs] added systemlogs to long tasks create, update and delete

Enterprise features:
- [AD] push approver permission
- [attribution] pass custom segments onto custom scheme too
- [surveys] improved export format


## Version 20.11.2.13

Fixes:
- [frontend] fixes for making server side tables to be exported as local
- [web] fix case for enhancing crash data for JSON POST request

Enterprise fixes:
- [drill] export tables locally
- [users] use indexed lac property for Last Seen on

## Version 20.11.2.12

Fixes:
- [prelogin] do not use double params in templates
- [scripts] epel repo installing only for centos 7 

Enterprise Improvements:
- [active_directory] azure ad latest client & fixing group pagination
- [active_directory] default group
- [active_directory] use proper intersection for restrict
- [attribution] fix mobile manual attribution check
- [attribution] option to pass query data to end url
- [dashboards] format duration on drill widgets
- [dashboards] sharing with groups
- [surveys] show popup in center for android and ios

## Version 20.11.2.10

Improvements:
- [api] SDK pre hook for modifying request properties

Enterprise Improvements:
- [cohorts] broken cohort reference causes cohort drawer to fail
- [drill] store cache as stringified version
- [ldap] include group alias for matching with countly groups


## Version 20.11.2.8

**Fixes**
- [batcher] handle BSON overflow correctly
- [docker] fixing invalid CE plugin list
- [nginx] update blocking paths example
- [push] fix recording data points
- [security] cryptographically secure random string generation

**Enterprise fixes**
- [attribution] fixed conversion for web apps
- [gateway_processor] fix traffic job query
- [surveys] production file generation fix

**Improvements**
- [audit-logs] add option not to record and show IP address
- [populator] add search keywords
- [settings] set api.domain in settings automatically
- [sources] update web domain group logic to ignore fourth level subdomains

**Enterprise Improvements**
- [cognito] added cognito client id and secret in cofig
- [cognito] revoke cognito token on logout
- [drill] allow to batch inserts for higher rate but lower consistency
- [drill] record message in Audit logs after meta regeneration called via API is finished
- [gateway_processor] ignore app does not exist errors setting
- [ldap] ldap group authentication

## Version 20.11.2.7

**Fixes**
- [block] backward compatibility for regex filters - filtering rules
- [block] blocking rules contains and doesn't contain bugfix
- [cohorts] deleting a cohort breaks dependent cohorts if any
- [encryption] do not process incorrect values
- [events] remove omited segments limitation
- [export] added debbuging information on app_user export
- [gateway] updated grpc and pubsub package
- [remote-config] do not encode remote config response while sending response to the sdk
- [surveys] changes to add other option for surveys
- [views] pass server url also in case of dropdown menu for domains


## Version 20.11.2

**Fixes**
* [analytics] fixed top calculation to be the same in all places
* [api] more aggregated data checks for merging metrics
* [api] remove all trailing $ symbols in events
* [configs] fix refreshing value when updating config
* [config] subdirectory cases for localhost calls
* [crashes] updated app version column header
* [export] use internal request processor instead of localhost for request exports
* [logger] remove sdk mismatch warning as they should be fully cross compatible
* [populator] add populator tag to all generated users
* [push] batched sent messages deletion
* [push] dealing with autocompletion for other credentials
* [push] extra check on multiple “send” button clicks in a row
* [push] fixing unsuccessfull message compilation for highly-concurrent cases
* [push] full support for transactional notifications
* [push] missing notification header in some cases
* [push] missing personalization tooltips on preview
* [push] wording fix for expiration description
* [reports] fixing link when countly works from subdirectory
* [server-stats] changed format of dp reports
* [sources] fixed direct calculation logic
* [star-rating] feedback sticker style bug fixed
* [views] fix view postprocessing with dots in names
* [views] fixed view export file name
* [views] show view names in graph tooltips

**Enterprise fixes**
* [active_users] emphasize that Active user totals are average
* [attribution] fix fetching data on period change in campaign details
* [block] fix displaying internal event names
* [cohorts] fixed limit of 800K users
* [cohorts] less memory usage for cohort calculation
* [cohorts] run tasks in series
* [concurrent-users] fixed on data breakdown in the view
* [dashboards] allow single app, multi event, single metric
* [drill] allow selecting OR for numbers and dates
* [drill] change user property view name to last view
* [drill] fixed week 53 problem
* [drill] unique user count fixed in multi BY queries
* [formulas] fixed visual bug for no buckets case
* [funnels] fixed "times" number not displayed properly
* [populator] heat map fixed
* [retention_segments] user merge sharding fix
* [survers] fixed bug when survey becomes visible again
* [surveys] fixed exporting surveys data appear as [object Object]
* [users] changed "fac" column as "First seen on" and "fs" as "First session"
* [users] correctly display purchase data
* [users] fix cohorts queries for export

**Improvements**
* [alerts] add support for Data Point alerts
* [api] add new metric, manufacturer
* [crashes] added binary images view to CE
* [populator] allow overriding
* [push] added search to select lists
* [push] proxy support for attachment HEADing
* [security] add enabling/disabling autocomplete on login forms
* [server-stats] added command line support

**Enterprise Improvements**
* [crashes] automatic crash symbolication
* [dashboards] changed selected event limit from 3 to 5
* [flows] add configuration for maxSampleSize
* [formulas] allow selecting numerical user properties too
* [groups] allow multi group assignment to users
* [hooks] add processing of some internal events like views, crashes, performance, etc
* [ldap] separate ldap plugin
* [performance-monitoring] allow custom time filtering in performance monitoring
* [push] add event segmentation to push personalisation options
* [retention_segments] added minimal weighted calculation method
* [surveys] allow custom logo upload
* [surveys] allow duplicating surveys
* [surveys] allow text customizations
* [symbolication] do not display very long error names in full
* [views] correctly postprocess views in Drill
* [whitelabeling] override logo in email template too

**Development related**
* [api] count all merges
* [api] refactored versionCompare and added unit tests for it
* [docker] Adding which to CentOS API image & removing pystan in debian image
* [reportmanager] debbug logs for rerunning tasks
* [scripts] getting rid of global grunt and adding sass to build steps

## Version 20.11.1

**Fixes**
* [apps] application settings Save button fixed
* [consolidate] UI fixes
* [events] fixed displaying long segents in events table
* [events] fixed issue when updating event description doesn't work
* [events] top events - check for deleted events
* [push] fixed APN issue when DNS returns 1 IP
* [star-rating] first emotion size problem fixed
* [two-factor-auth] fxied when session was enabled before OTP verification
* [UI] date picker behavior improvements
* [UI] provide notification popup to notify about incomplete upgrade
* [views] fixed edit views table export
* [views] fixed showing renamed view name in table

**Enterprise fixes**
* [active_directory] fix retrieving email address for azure auth
* [ab-testing] centos 8 support
* [cohorts] allow to treat some lists as numbers
* [cohorts] allow using numbers in AND statements
* [cohorts] fix is set filling on cohort edit
* [cohorts] improve cohort overview loading with more than 100 cohorts
* [crash_symbols] changed the wording of debug symbol files
* [dashboards] disable confirm popup on custom dashboard screenshots
* [dashboards] fixed colors for white theme
* [dashboards] remove dashboard user when user deleted
* [drill] aggregated data regeneration fixed when daylight saving time occurs
* [drill] handle arrays properly in meta generations
* [formulas] don't allow to use same name and improve the messages on pop-up(s)
* [funnels] improve funnel overview loading
* [funnels] store funnel data in gridfs for report manager to allow large data storage
* [okta] fixed issuer url
* [remote-config] fixed not loading remote config list when there are many values
* [retention_segments] correct retention type descriptions
* [retention_segments] links to user profiles should be removed from tooltips
* [surveys] fixed All Time selection
* [users] fix increasing event count in sessions table
* [users] fixed ignoring query in user profile list on large quantity of custom properties
* [views] fixed heat maps

**Enterprise Improvements**
* [concurrent_users] less writes on data ingestion
* [concurrent_users] show Max Concurrent Online Users in the analytics section
* [dashboards] allow font customizations for notes widget
* [dashboards] allow separate period in some widgets
* [funnels] add caching mode options for bigger data
* [groups] allow space in group id
* [retention_segments] add configurable size to days in retention in custom dashboards
* [retention_segments] display percentages in the cells in custom dashboards
* [users] Adding push tokens & geo to user filter
* [users] exported files allow to have formatted date

**Development related**
* [api] fixed output error log
* [api] respond 200 on checksum fails to allow process rest of requests
* [auth_plugins] use member utility
* [crash_symbols] add a log for errors when testing symbolication server
* [crash_symbols] added a script to test symbolication server connection
* [jobs] Relaxing IPC timeout
* [logs] output version and plugin set on proces start
* [mongodb] latest driver fixes
* [scripts] added Centos 8 and Ubuntu 20 support
* [scripts] removed CentOS 6 support
* [timezones] updated timezone information
* [users] allow to query user details by uid and did values in API
* [users] expose more user properties in user profiles view

## Version 20.11

**Fixes**
* [api] fixed top 3 percentage distribution
* [crashes] stop propagation of click on external link
* [data_migration] more explanatory error messages
* [events] allow event management for admins
* [events] make back button work on events changes
* [frontend] fixed table exports if there is ' or " in text
* [frontend] remove absolute paths from template
* [jobs] rescheduling fixes
* [plugins] fixed regenerating all files on plugin state changes
* [push] credentials upload fix
* [push] fixing connections and server selection/access
* [push] prevent push slider to be opened when no credentials set
* [star-rating] added safari only styles for sticker
* [star-rating] feedback popup will reset and be reusable after 10 seconds
* [star-rating] fixed comments table sort problem
* [two-factor-auth] fix displaying qr code inside dashboard
* [views] search by view name not case sensitive

**Enterprise fixes**
* [attribution] fixed no update button on campaign edit
* [block] fix event property checks
* [cohorts] optimize loading cohorts data in overview
* [crash_symbolication] strip trailing slash from symbolication server url
* [crashes-jira] fix if app was deleted
* [dashboards] fixed login out on dashboards email report
* [flows] improvements, reduce reads, remove unused code, improve pipeline
* [funnels] make total users period dependent again
* [systemlogs] prevent multiple requests for the table and ensure using index
* [users] improve detailed user data loading by separateing network calls and implementing refresh logic
* [views] fix showing heatmap
* [views] rename Action map to Heatmap

**Improvements**
* [alerts] add notification to show if plugin is disabled for specific alerts
* [alerts] add star rating metric
* [consolidate] new plugin to duplicate data into multiple apps
* [core] optimizied core for data ingestion
* [crashes] add way to get error name for PL Crash reports
* [crashes] allow selecting crash grouping strategies (default is error and file)
* [errorlogs] show multiple logs available in logs folder
* [events] ability to use multiple events as single group on aggregated data
* [export] stream exporting data instead of calculating in memory and limiting exports
* [frontend] add device_type data (tablet, phone, desktop, etc)
* [frontend] added danger zone in user settings for deleting account
* [frontend] automatically go to last used view in dashboard after login
* [frontend] improved event blueprint table to be scalable for event count through server side table
* [frontend] renamed configurations to settings
* [ip_store] optional plugin to record user ip as custom property
* [jobs] new view to display job list and their information
* [push] Huawei PushKit support
* [push] allow resending failed notifications
* [push] support for auto messages cancellation when condition is no longer met
* [report-manager] improving UI between manual and auto reports
* [report-manager] show latest reports inline in to bar
* [report-manager] showing errors in the table
* [reports] allow selecting which events to include in email report
* [reports] updated email template
* [sources] add source channel property
* [two-factor-auth] confirm credentials before two-factor-auth check/setup in login

**Enterprise Improvements**
* [ab-testing] added ab testing data to user profiles
* [active_directory] upgraded to new version and improvements
* [activity-map] show user activity on map for country, region and city levels
* [attribution] added to email reports
* [block] allow controling filtering rules via command line
* [block] new operator support
* [cohorts] add static date support and more date options
* [config-transfer] allow transfering configs between apps and servers (like funnels, cohorts, etc)
* [crash_symbolication] added initial JS source map support
* [dashboards] separate widget loading
* [data_manager] transform incoming data
* [drill] add locale property
* [drill] added caching to user estimation correction
* [drill] allow recalculating aggregated data
* [drill] batched meta generation instead of real time processing
* [formulas] no bucket option
* [funnels] add session funnels
* [oidc] Open ID Connect authentiation support
* [okta] OKTA authentication support
* [performance-monitoring] added performance data to user profiles
* [performance-monitoring] added to email reports
* [push] personalization for custom properties
* [remote-config] pre-defined values for remote config
* [star-rating] add link to user profiles
* [surveys] allow creating surveys and NPS widgets to collect feedback from your users
* [users] allow to select which columns to export in User Profiles
* [users] make segments and segment values searchable and exportable in event timeline

**Development related**
* [api] add additional metrics to app_users
* [api] add whitelisting segments for events
* [api] added first_sync property for server time sync
* [api] allow timestamps one hour in future
* [api] api add support for more period formats
* [api] deal with situation when on /i/bulk passed param requests is not Array
* [api] don't write to yearly 0 documents when not needed (none-unique values)
* [api] more events validation, count as number and no sub segments
* [api] new logic for safe api requests and ACK request only when user merging is finished
* [api] record more session params for aggregated data
* [api] removing unused mt property
* [api] request id concept
* [api] use fac and lac as seconds timestamp to preserve space
* [cmd] fix logging of upgrade commands
* [cohorts][funnels] back to master process
* [core] Make mail to use configurable "from" for reports
* [core] remove mongoskin usage
* [data_migration] fixed compatability with MongodB 4.4+
* [data_migration] pass result from redirect request to SDK
* [db] fix service type of mongodb on systemd to prevent interrupt wiredtiger's boot
* [db] making sure collections are shardable
* [frontend] automatically load CSS files in the folder
* [frontend] fix to don't override and merge points in pie chart if moreInfo passed
* [frontend] remove intercom
* [frontend] use separate translation files in developer mode
* [mognodb] add default options and separate mongodb check script (https://c.ly/install/mongodb)
* [package] latest mongodb driver 3.6+
* [package] remove time module
* [plugins] install dependencies first and then run install script
* [push] always run forks
* [scripts] output errors on backup/restore
* [tests] shared db connection
* [users] add wildcard index for cohorts

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

