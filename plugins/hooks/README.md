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

## Using Hooks

First, ensure that Hooks is enabled. In the Sidebar, navigate to Management > Feature Management and switch on the Hooks toggle.

## Creating a New Hook

To create a new Hook in the Countly Hooks Plugin, follow these steps:

### Step 1: Start a New Hook

- Click on the **+ New Hook** button located in the top right corner of the default view. A new drawer will open where you’ll need to fill out the following fields.

### Step 2: Fill in Hook Details

1. **Hook Name**: Enter a concise and descriptive name for your Hook. This field is required and should adhere to SDK naming limitations.
2. **Description** (optional): Provide a brief explanation of the Hook’s purpose. This can help your colleagues understand why it was created. Avoid long descriptions and special characters.
3. **Source App**: Select the application where the Hook will apply. You can use the search bar to find your app, but only one app can be chosen per Hook. Click on **Next Step** to proceed to trigger selection.

### Step 3: Select the Trigger Type

From the dropdown, choose a trigger type for your Hook. Options include:

- **Tracked Data**
- **Internal Actions**
- **API Endpoint**

#### For Tracked Data

- Choose a specific data point from the list or dropdown.
- Set a filtering rule if needed; you may add multiple conditions.

#### For Internal Actions

- Select a trigger from the dropdown.
- Depending on the chosen trigger, specify the details using the subsequent dropdown (e.g., select a specific cohort from the list).

#### For API Endpoint

- Choose a trigger from the dropdown.
- Specify further using the new dropdown that appears (e.g., select a cohort).

### Step 4: Set up a Recurring Trigger (Optional)

Select one of the following frequencies for the trigger:

- **Every hour** (includes time zone selection)
- **Every day** (includes time zone selection)
- **Every week** (select day of the week, hour, and time zone)
- **Every month** (select day of the month from 1 to 28, hour, and time zone)

Then, specify when the trigger should run.

### Step 5: Choose an Action Type

Choose an action from the dropdown options:

- **Send Email**
- **Make HTTP Request**
- **Custom Code**

You can add multiple actions by clicking **Add Action**.

### Step 6: Test the Hook (Optional)

- To verify if the Hook functions as expected, click the **Test the Hook** button. For further guidance, refer to the “Testing a Hook” section below.

### Step 7: Save the Hook

After completing all fields, click **Save**. A success message will confirm that your Hook has been saved successfully.
