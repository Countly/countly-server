##What's Countly?
Countly is an innovative, real-time, open source mobile analytics application. It collects data from mobile phones, and visualizes this information to analyze mobile application usage and end-user behavior. There are two parts of Countly: the server that collects and analyzes data, and mobile SDK that sends this data (for iOS & Android).

##How do I install Countly Server?

We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you feel like doing things manually you can take a look at the installation articles from [http://support.count.ly](http://support.count.ly "Countly Support").

##API & Frontend

Quick overview of some important files and directories included in this package;

####1. frontend/express/app.js

Countly dashboard that runs on express server.

####2. frontend/express/public/javascripts/countly
Contains seperate  helper js files for each data visualization. For example `countly.session.js` is responsible for calculating session related metrics and interacts with `api/api.js` to retrieve data from the sessions collection.
####3. api/api.js

Countly write and read API. Waits for write requests from the iOS/Android SDKs and read requests from the countly js helpers.

##Which mobile operating systems are supported?
Countly offers integration with world's two leading smartphones, Android and iOS.

##How can I help you with your efforts?
Glad you asked. We need ideas, feedbacks and constructive comments. All your suggestions will be taken care with upmost importance. 

We are on [Twitter](http://twitter.com/gocountly) and [Facebook](http://www.facebook.com/Countly) if you would like to keep up with our fast progress!

##Home

[http://count.ly](http://count.ly "Countly")

##Community & support

[http://support.count.ly](http://support.count.ly "Countly Support")
