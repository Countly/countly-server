# Custom Dashboard plugin

## File structure
File structure follows usual Countly plugin structure
```
/dashboards
├── api
│   ├── api.js
│   └── parts
│       └── dashboards.js                       # Contains code for reading/updating custom dashboard data to db
├── frontend
│   ├── app.js
│   └── public
│       ├── javascripts
│       │   ├── countly.helpers.js
│       │   ├── countly.models.js               # Contains code for sending/requesting data to backend
│       │   ├── countly.views.js                # UI components and pages for custom dashboards
│       │   ├── countly.widgets.analytics.js    # Code for analytics widget
│       │   ├── countly.widgets.events.js       # Code for events widget
│       │   ├── countly.widgets.note.js         # Code for note widget
│       │   └── screenfull.min.js               # Third party library that display custom dashboard in full screen mode
│       ├── localization
│       ├── stylesheets
│       │   └── main.scss
│       └── templates
│           ├── dashboards-drawer.html          # Template for drawer for creating/editing custom dashboard
│           ├── dashboards-menu.html            # Template for custom dashboard listing in sidebar
│           ├── email.html                      # Template for email notification
│           ├── grid.html                       # Template for displaying widgets in a custom dashboard
│           ├── helpers                         # Template for components that are used when editing/displaying widget
│           │   ├── drawer
│           │   │   ├── app-count.html
│           │   │   ├── breakdown.html
│           │   │   ├── colors.html
│           │   │   ├── data-type.html
│           │   │   ├── display.html
│           │   │   ├── events.html
│           │   │   ├── metric.html
│           │   │   ├── period.html
│           │   │   ├── source-apps.html
│           │   │   ├── title.html
│           │   │   └── visualization.html
│           │   └── widget
│           │       ├── apps.html
│           │       ├── bucket.html
│           │       ├── period.html
│           │       ├── primary-legend.html
│           │       ├── secondary-legend.html
│           │       ├── title.html
│           │       └── title-labels.html
│           ├── index.html                      # Template for custom dashboard plugin main page
│           ├── invite-email.html               # Template for email notification
│           ├── transient                       # Template for when there's no custom dashboard or widget
│           │   ├── disabled-widget.html
│           │   ├── invalid-widget.html
│           │   ├── no-dashboard.html
│           │   └── no-widget.html
│           ├── widget-drawer.html              # Template for drawer for creating/editing widget
│           ├── widget.html                     # Base template for displaying widget
│           └── widgets                         # Specific template for widget
│               ├── analytics
│               │   ├── drawer.html
│               │   └── widget.html
│               ├── events
│               │   └── drawer.html
│               └── note
│                   ├── drawer.html
│                   └── widget.html
├── install.js
├── package.json
├── package-lock.json
├── README.md
├── tests.js
└── uninstall.js
```

## Overview
Custom Dashboards enables creating widgets that display data. With this, the most important data from a Countly dashboard can be gathered and displayed in one page.
