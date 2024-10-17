# Compliance Hub plugin

The Compliance Hub plugin is designed to manage user consent and related metrics within the Countly analytics platform. This plugin ensures that user data is handled in compliance with various data protection regulations.

## File structure
File structure follows usual Countly plugin structure
```
compliance-hub/
├── api/ 
│    └── api.js                               # compliance hub API for managing user consent and related metrics    
├── frontend/
│   ├── public
│   │    ├── javascripts
│   │    │    ├── countly.models.js           # model code for consent management
│   │    │    └── countly.views.js            # views code.
│   │    ├── localization                     # all localization files
│   │    ├── stylesheets
│   │    └──  templates
│   │         ├── consentHistory.html         # template for consent history table
│   │         ├── exportHistory.html          # template for export history
│   │         ├── main.html                   # compliance hub header 
│   │         ├── metrics.html                # consent metrics dashboard
│   │         ├── user.html                   # user consent data table
│   │         └── userConsentHistory.html     # user consent history table
│   └── app.js
├── install.js
├── package.json
├── README.md
└── tests.js                                  # plugin tests
```