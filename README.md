##What's Countly?
Countly is an innovative, real-time, open source mobile analytics application. It collects data from mobile phones, and visualizes this information to analyze mobile application usage and end-user behavior. There are two parts of Countly: the server that collects and analyzes data, and mobile SDK that sends this data (for iOS & Android).

Below you can find Countly SDK repositories. Each SDK has its own installation instruction.

- [Countly Android SDK (countly-sdk-android)](https://github.com/Countly/countly-sdk-android)
- [Countly iOS SDK (countly-sdk-ios)](https://github.com/Countly/countly-sdk-ios)

##How do I install Countly server?

We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you feel like doing things manually you can take a look at the installation articles from [http://support.count.ly](http://support.count.ly "Countly Support").

##How do I upgrade my Countly server?

countly-server package includes an upgrade script (`bin/countly.upgrade.sh`) that takes care of the upgrade process. [See this tutorial](http://support.count.ly/kb/web-installation/upgrading-countly-server-to-v1209-from-v1208) if you would like to perform the upgrade manually (12.08 to 12.09).

##API & Frontend

Quick overview of some important files and directories included in this package;

####1. frontend/express/app.js

Countly dashboard that runs on express server.

####2. frontend/express/public/javascripts/countly
Contains seperate  helper js files for each data visualization. For example `countly.session.js` is responsible for calculating session related metrics and interacts with `api/api.js` to retrieve data from the sessions collection.
####3. api/api.js

Countly write and read API. Waits for write requests from the iOS/Android SDKs and read requests from the countly js helpers. Refer to [Countly Server API Reference](https://github.com/Countly/countly-server/wiki/Countly-Server-API-Reference) for details.

##Which mobile operating systems are supported?
Countly offers integration with world's two leading smartphones, Android and iOS.

##How can I help you with your efforts?
Glad you asked. We need ideas, feedbacks and constructive comments. All your suggestions will be taken care with upmost importance. 

We are on [Twitter](http://twitter.com/gocountly) and [Facebook](http://www.facebook.com/Countly) if you would like to keep up with our fast progress!

##Home

[http://count.ly](http://count.ly "Countly")

##Community & support

[http://support.count.ly](http://support.count.ly "Countly Support")

##Rebranding

Ask us (hello@count.ly) if you want to rebrand Countly and we'll be glad to help.