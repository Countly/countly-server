# System Logs plugin

## File structure
File structure follows usual Countly plugin structure
```
/systemlogs
├── api
│   └── api.js
├── frontend
│   ├── app.js
│   └── public
│       ├── javascripts
│       │   ├── countly.models.js   # Contains code for sending/requesting data to backend
│       │   └── countly.views.js    # UI components and pages for systemlogs plugin
│       ├── localization
│       ├── stylesheets
│       └── templates
│           ├── logs-expanded.html  # Template for displaying detailed systemlog information
│           └── logs.html           # Template for systemlogs plugin main page
├── install.js
├── package.json
├── package-lock.json
├── README.md
├── scripts
│   └── export.js                   # Script for exporting logs with countly cli
├── tests.js
└── uninstall.js

9 directories, 40 files
```

## Overview
Logs specific events in the dashboard with detailed information of what has happened.
