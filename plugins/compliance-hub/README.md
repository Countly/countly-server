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

## Key Features

- **Collect User Consents:** Prompt first-time users to consent to data collection, detailing which types of data (e.g., sessions, crashes, views) will be collected. No data is sent unless the user opts in.
- **Manage User Requests:** The "Consents" tab (available in Enterprise Edition) lets admins view and fulfill user requests for data export or deletion.
- **SDK Integration:** Countly SDKs (iOS, Android, Node.js, Web) support flexible consent management, allowing opt-in/opt-out on a per-feature basis. SDKs default to opt-in for backward compatibility but can be configured to require opt-in consent at initialization.

## Using the Compliance Hub

Access the Compliance Hub via Main Menu > Utilities > Compliance Hub. The Compliance Hub offers the following views:
1. **Metrics View:** Track opt-ins and opt-outs across various features (e.g., sessions, crashes) over time in a time-series graph.
2. **Users View:** List users with consent histories. Each entry shows user ID, device info, app version, and consent types. Options include viewing consent history, exporting user data, and purging data if required.
3. **Consent History:** A complete list of all opt-in and opt-out actions across metrics, allowing for easy tracking.
4. **Export/Purge History:** See a record of all data export and deletion actions for compliance tracking.