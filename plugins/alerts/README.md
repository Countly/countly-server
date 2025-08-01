# Alerts plugin

The Alerts plugin in Countly is a reactive tool designed to keep you informed about critical changes in your application’s metrics, even when you’re not monitoring dashboards. It sends email notifications when specific conditions on important metrics are met, enabling you to respond quickly to potential issues. This feature helps ensure your app maintains high performance and provides a positive user experience by alerting you to areas that may need immediate attention.

## File structure
File structure follows usual Countly plugin structure
```
alerts/
├── api/ 
     ├── alertModules/
     │    ├── cohorts.js                        # cohort alert checker
     │    ├── crashes.js                        # crash alert checker
     │    ├── dataPoints.js                     # data points alert checker
     │    ├── events.js                         # events alert checker
     │    ├── nps.js                            # NPS alert checker
     │    ├── rating.js                         # rating alert checker
     │    ├── sessions.js                       # sessions alert checker
     │    ├── survey.js                         # survey alert checker
     │    ├── users.js                          # users alert checker
     │    └── views.js                          # views alert checker
     ├── jobs/monitor.js                        # alert monitoring job
     ├── parts/
     │    ├── common-lib.js
     │    └── utils.js
     └── api.js                                 # alert management API and all API endpoints
├── frontend/
│   ├── public/
│   │    ├── javascripts
│   │    │    ├── countly.models.js             # model code. Facilitates requests to backend (CRUD) 
│   │    │    └── countly.views.js              # views code. Alerts view, Dashboard home widget
│   │    ├── localization                       # All localization files 
│   │    ├── stylesheets
│   │    └── templates 
│   │         ├── email.html                    # template for email 
│   │         └── vue-main.html                 # template for Alerts view (including home and drawer)
│   └── app.js
├── install.js
├── package.json
├── README.md
└── tests.js                                    # plugin tests
```

## Key Features

- **Customizable Alerts:** Define specific conditions for metrics such as crashes, cohorts, data points, events, Net Promoter Score (NPS), online users, rating, revenue, sessions, surveys, users, and views. Get notified whenever these conditions are met.
- **Real-Time Notifications:** Receive email alerts for immediate awareness of changes in your metrics.
- **Detailed Monitoring:** Track a broad range of metrics, including user engagement, performance, user feedback, and error rates.
- **Easy Setup:** Simple configuration allows you to set and customize alerts quickly to fit your needs.

## Example Use Case

Imagine you’ve released a new version of your app. Although it passed all tests, some critical bugs may still slip through. These bugs might prevent users from fully using the app. By setting up alerts for sudden spikes in crashes or decreased user activity, you can catch these issues early and work to resolve them, ensuring minimal disruption.

## Generate alerts job

Job name: alerts:monitor

Job is set to run each hour, each day or each month according to the configuration set in the creation of alerts. It checks all the alert conditions defined by the users periodically and triggers email notifications if any conditions are met.