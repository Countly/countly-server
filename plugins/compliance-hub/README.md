# Compliance Hub plugin

The Compliance Hub plugin for Countly is designed to manage user consent and related metrics, ensuring compliance with various data protection regulations. It provides a comprehensive API for handling user consent, integrating seamlessly with the Countly analytics platform. The plugin includes robust functionality for managing and displaying consent data, featuring templates for consent history, export history, and user consent data tables. Additionally, it offers a dashboard for visualizing consent metrics, helping organizations maintain transparency and compliance.

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