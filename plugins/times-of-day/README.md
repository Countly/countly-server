# Countly times-of-day plugin

The Times of Day plugin provides a visual representation of user activity based on local time, offering a scatter plot chart that shows when sessions and events occur across different days of the week.

## File Structure

```javascript
times-of-day/
├── api/                                            # Backend API logic
│   └── api.js                                      # Main API file handling backend requests and responses
├── frontend/                                       # Frontend resources
│   ├── public/                                     # Publicly accessible resources
│   │   ├── images/                                 # Images used in the plugin
│   │   │   └── times-of-day/                       # Folder for times-of-day related images
│   │   │       └── times-of-day.svg                # SVG image for times-of-day widget
│   │   ├── javascripts/                            # JavaScript files for frontend logic
│   │   │   ├── countly.models.js                   # Model definitions for data handling
│   │   │   ├── countly.views.component.common.js   # Common view component logic
│   │   │   └── countly.views.js                    # View definitions for rendering
│   ├── localization/                               # Localization files for multi-language support
│   ├── stylesheets/                                # Stylesheets for styling the plugin
│   │   ├── main.css                                # Compiled CSS for styling
│   │   ├── main.css.map                            # Source map for the CSS file
│   │   └── main.scss                               # Main SCSS stylesheet
│   ├── templates/                                  # HTML templates for UI components
│   │   ├── times-of-day-widget-drawer.html         # Drawer template for the times-of-day widget
│   │   ├── times-of-day-widget.html                # Main template for the times-of-day widget
│   │   └── times-of-day.html                       # Template for times-of-day display
├── app.js                                          # Main application logic for the frontend
├── install.js                                      # Installation script for the plugin
├── package-lock.json                               # Lock file for Node.js dependencies
├── package.json                                    # Package configuration file for Node.js
├── tests.js                                        # Test scripts for validating functionality
└── uninstall.js                                    # Uninstallation script for removing the plugin
```

## Key Features

- **Visual User Activity Mapping**: TDisplays a scatter plot chart showing when user sessions and events occur throughout the day, providing a clear visual representation of user activity patterns.
- **Data Type Filters**: Allows filtering the data by Sessions, Events, Consent, and Push Actioned, giving flexibility in analyzing different types of user interactions
- **Custom Time Ranges**: Enables selection of different time periods (e.g., All Time, Last 30 Days) to adjust the data view to fit your specific analysis needs.
- **Localized Time Representation**: Displays user activity based on their local time zone, making it easier to track engagement across different regions

## Installation

1. Navigate to the directory where the times-of-day plugin is located. This could be a relative or absolute path depending on your environment setup:

    ```bash
    cd /path/to/your/project/times-of-day
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

## Using Times of Day

The Times of Day feature allows you to analyze user activity based on specific time criteria. Follow these steps to effectively use this tool.

### Step 1: Selecting Criteria

- **Criteria Options**: Start by selecting a criteria from the **Dropdown Menu** at the top left. Available options include:
  - **Sessions**
  - **Events**
  - **Consent**
  - **Push Action**

- **Time Period**: Use the **Dropdown Menu** at the top right to specify a time range. This will automatically refresh the data chart and data table with the relevant activity details.

### Step 2: Understanding the Data Chart

- The **Data Chart** shows activity by **hour of the day** (in 24-hour format on the x-axis) and **day of the week** (on the y-axis).
- **Colored circles** represent activity levels at each time and day intersection. The larger the circle, the higher the number of users.
- You can download this chart as a **PNG image** by clicking the **Downward Arrow** button at the top right of the chart.

### Step 3: Understanding the Data Table

- Below the Data Chart is the **Data Table**, which provides the information in a detailed, tabular format with specific user counts.
- The table includes:
  - **Hours**: Each hour of the day, in hourly segments.
  - **Days**: Columns for each day of the week showing the active user count per hour.

- You can export the table in **CSV, JSON, or XLSX** format by clicking the **Downward Arrow** button at the top right of the table.

This feature is ideal for visualizing and exporting user activity based on selected criteria and time frames for further analysis.
