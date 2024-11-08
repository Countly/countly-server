# Alerts plugin

The Alerts plugin is designed to monitor various metrics and events within the Countly analytics platform. It provides a structured way to set up alerts for different types of data, ensuring that users are notified when specific conditions are met. Below is a detailed breakdown of the plugin's file structure and its components:

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
     │    ├── revenue.js                        # revenue alert checker
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

## Generate alerts job

Job name: alerts:monitor

Job is set to run each hour, each day or each month according to the configuration set in the creation of alerts. It checks all the alert conditions defined by the users periodically and triggers email notifications if any conditions are met.