# Crashes plugin

## File structure
File structure follows usual Countly plugin structure
```
/crashes
├── api
│   ├── api.js
│   ├── jobs
│   │   └── cleanup_custom_field.js                     # Background job for cleaning up custom field in crashgroups
│   └── parts
│       ├── custom_field.js                             # Contains code for dealing with crash custom fields
│       ├── minidump.js                                 # Contains code for processing JavaScript stacktrace by using third party binary
│       ├── stacktrace.js                               # Contains code for processing crash report stacktrace
│       └── version.js                                  # Contains code for processing app version information in crash reports
├── bin
│   └── minidump_stackwalk                              # Third party binary for processing JavaScript stacktrace
├── frontend
│   ├── app.js
│   └── public
│       ├── javascripts
│       │   ├── countly.common.components.js            # UI components that can be used globally
│       │   ├── countly.models.js                       # Contains code for sending/requesting data to backend
│       │   ├── countly.query.builder.crashgroups.js    # Custom query builder for filtering crashgroups in dashboard
│       │   ├── countly.views.js                        # UI components and pages for crashes plugin
│       │   └── countly.widgets.crash.js                # UI components for crashes widget in custom dashboard
│       ├── localization
│       ├── stylesheets
│       └── templates
│           ├── binary-images.html                      # Template for crash binary image page
│           ├── crashesHomeWidget.html                  # Template for crash widget in home page
│           ├── crashgroup.html                         # Template for crashgroup detail page
│           ├── dashboard-widget
│           │   ├── drawer.html                         # Template for crashes widget drawer in custom dashboard
│           │   └── widget.html                         # Template for crashes widget in custom dashboard
│           ├── overview.html                           # Template for crashgroup listing page
│           ├── stacktrace.html                         # template for stacktrace display
│           ├── tab-label.html                          # Template for tabs in crashes page
│           └── user-crashes.html                       # Template for crashgroup listing in user profile page
├── install.js
├── package.json
├── package-lock.json
├── README.md
├── tests.js
└── uninstall.js
```

## Overview
Collects crash reports that are grouped in crashgroups. These crashgroups and crash reports can then be viewed in the dashboard to facilitate bug/error tracking.

Crash reports contain an error stacktrace and other information about when and where the crash happened (e.g. mobile app version, device type, etc). Crash reports with similar stacktrace are grouped together. The stacktrace and other informations can be used to search and filter the crashgroups in the dashboard.

Crash reports are stored in `app_crashes[app_id]` collection. Crashgroups are stored in `app_crashgroups[app_id]` collection.

## Background jobs

### Cleanup custom field
Removes custom fields in crashgroups if they are over the threshold. Threshold can be set from dashboard settings.

This job is disabled by default, since the operation is heavy. It can be enabled from dashboard settings. It is scheduled to run at 01:01 AM everyday to avoid high traffic.
