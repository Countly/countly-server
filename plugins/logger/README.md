# Logger plugin

## File structure
File structure follows usual Countly plugin structure
```
plugins/logger
├── api
│   ├── api.js
│   └── helpers
├── frontend
│   ├── app.js
│   └── public
│       ├── javascripts
│       │   ├── countly.models.js   # Contains code for sending/requesting data to backend
│       │   └── countly.views.js    # UI components and pages for logger plugin
│       ├── localization
│       ├── stylesheets
│       │   └── logger.scss
│       └── templates
│           └── logger.html         # Template for logger plugin main page
├── install.js
├── package.json
├── package-lock.json
├── README.md
├── tests.js
└── uninstall.js
```

## Overview
Logs incoming requests with all their parameters
