# Star Rating plugin

## File structure
File structure follows usual Countly plugin structure
```
plugins/star-rating
├── api
│   ├── api.js
├── frontend
│   ├── app.js
│   └── public
│       ├── fonts
│       ├── images
│       ├── javascripts
│       │   ├── countly.models.js                   # Contains code for sending/requesting data to backend
│       │   ├── countly.views.js                    # UI components and pages for star-rating plugin
│       ├── localization
│       ├── stylesheets                             # Styling for star rating widget
│       │   ├── comment-table.scss
│       │   ├── countly-feedback-web.scss
│       │   ├── ratings-iframe.scss
│       │   ├── ratings.scss
│       │   └── widget-detail.scss
│       └── templates
│           ├── comments-table.html                 # Template for showing comment listing
│           ├── drawer.html                         # Template for drawer for creating/editing rating widget
│           ├── feedback-popup.html                 # Template for displaying rating widget
│           ├── main.html                           # Template for star rating plugin main page
│           ├── ratings-tab.html                    # Template for outer ratings tab content
│           ├── ratings-table.html                  # Template for showing rating listing
│           ├── report.html                         # Template for email report
│           ├── star-consent-link.html              # Template for displaying consent form in rating widget
│           ├── users-feedback-ratings-table.html   # Template for showing feedback listing
│           ├── users-tab.html                      # Template for inner ratings tab content
│           ├── widget-detail.html                  # Template for widget detail page
│           ├── widgets-tab.html                    # Template for widget tab content
│           └── widgets-table.html                  # Template for showing widget listing
├── install.js
├── mock.js
├── package.json
├── package-lock.json
├── README.md
├── tests.js
└── uninstall.js
```

## Overview
Collects rating value and feedback using a web widget.
