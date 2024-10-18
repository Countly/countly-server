# Countly Hooks Plugin

The Hooks plugin provides powerful automation for integrating Countly data with external systems. This plugin can trigger external HTTP endpoints based on internal events and incoming data, and send automated email notifications for events like user profile updates or users entering a cohort. Hooks offers a new way to feed external systems with Countly data, enabling real-time interactions and automating workflows.

## File Structure

```javascript
hooks/                                      # Main hooks plugin directory
├── api/                                    # Backend API logic
│   ├── jobs/                               # Job scheduling logic
│   │   └── schedule.js                     # Handles scheduling tasks
│   └── parts/                              # Logic for effects and triggers
│       ├── effects/                        # Different types of effects used in hooks
│       │   ├── custom_code.js              # Handles custom code execution
│       │   ├── email.js                    # Manages email-related hooks
│       │   ├── http.js                     # HTTP requests for hooks
│       │   └── index.js                    # Effect index for organization
│       └── triggers/                       # Triggers for executing hooks
│           ├── api_endpoint.js             # API endpoint trigger
│           ├── incoming_data.js            # Triggers for incoming data
│           ├── internal_event.js           # Internal event trigger
│           ├── scheduled.js                # Trigger for scheduled tasks
│           └── index.js                    # Trigger index file
├── api.js                                  # Main API logic for backend requests
├── testData.js                             # Sample test data for hooks
├── utils.js                                # Utility functions for hooks
├── frontend/                               # Frontend resources
│   ├── public/                             # Publicly accessible files
│   │   ├── javascripts/                    # JavaScript for frontend logic
│   │   │   ├── countly.hooks.effects.js    # Effect logic for frontend hooks
│   │   │   ├── countly.models.js           # Model definitions for hooks
│   │   │   └── countly.views.js            # View logic for rendering hooks
│   │   ├── localization/                   # Localization files for translations
│   │   ├── stylesheets/                    # CSS and SCSS for styling hooks UI
│   │   │   ├── vue-main.css                # Compiled CSS for UI
│   │   │   └── vue-main.scss               # Source SCSS file for styling
│   │   └── templates/                      # HTML templates for UI components
│   │       ├── vue-drawer.html             # Drawer UI for hooks
│   │       ├── vue-effects.html            # Effects UI template
│   │       ├── vue-hooks-detail-error-table.html  # Template for error table
│   │       ├── vue-hooks-detail.html       # Detail view of individual hooks
│   │       ├── vue-main.html               # Main template for hooks
│   │       └── vue-table.html              # Table template for hooks display
│   └── app.js                              # Main frontend application logic
├── install.js                              # Installation script for the plugin
├── package-lock.json                       # Lock file for Node.js dependencies
├── package.json                            # Package configuration for Node.js
├── tests.js                                # Test scripts for validating hooks functionality
└── uninstall.js                            # Uninstallation script for removing the plugin
```

## Installation

1. Navigate to the directory where the Hooks plugin is located. This could be a relative or absolute path depending on your environment setup:

    ```bash
    cd /path/to/your/project/hooks
    ```

2. Install dependencies:

    ```bash
    npm install
    ```
