# Error Logs plugin

## File structure
File structure follows usual Countly plugin structure
```
/errorlogs
├── api
│   └── api.js
├── frontend
│   ├── app.js
│   └── public
│       ├── javascripts
│       │   ├── countly.models.js   # Contains code for sending/requesting data to backend
│       │   └── countly.views.js    # UI components and pages for error logs plugin
│       ├── localization
│       ├── stylesheets
│       └── templates
│           └── logs.html           # Template for the main page of error logs plugin
├── install.js
├── package.json
├── package-lock.json
├── tests.js
└── uninstall.js
```

## Overview
Displays server logs in the dashboard.
