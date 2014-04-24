##What's Countly?
Countly is an innovative, real-time, open source mobile analytics application. 
It collects data from mobile phones, tablets and other internet-connected devices, and visualizes this information to analyze mobile application usage and end-user behavior. There are two parts of Countly: the server that collects and analyzes data, and mobile SDK that sends this data.

This repository holds Countly Community Edition. For more information other versions (e.g Enterprise Edition), see [Editions page](https://count.ly/products/editions/)

![Countly dashboard screenshot](http://a.fsdn.com/con/app/proj/countly/screenshots/dashboard_without_realtime.png)

##Which mobile operating systems does Countly support?

Countly supports top-notch devices, including iOS, Android, Windows Phone and Blackberry. Below you can find Countly SDK repositories. Each SDK has its own installation instructions.

- [Countly Android SDK](https://github.com/Countly/countly-sdk-android)
- [Countly iOS SDK](https://github.com/Countly/countly-sdk-ios)
- [Countly Windows Phone SDK](https://github.com/Countly/countly-sdk-windows-phone)
- [Countly Blackberry Webworks SDK](https://github.com/Countly/countly-sdk-blackberry-webworks)
- [Countly Blackberry Cascades SDK](https://github.com/craigmj/countly-sdk-blackberry10-cascades) (Community supported)
- [Countly Mac OS X SDK](https://github.com/mrballoon/countly-sdk-osx) (Community supported)
- [Countly Appcelerator Titanium SDK](https://github.com/euforic/Titanium-Count.ly) (Community supported)
- [Countly Unity3D SDK](https://github.com/Countly/countly-sdk-unity) (Community supported)

##How do I install Countly server?

You can either download all files from [Sourceforge](http://sf.net/projects/countly), or get code from Github (this page).
 
We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you feel like doing things manually, or need to upgrade Countly from a previous version, please take a look at the installation articles from [http://support.count.ly](http://support.count.ly "Countly Support").

##Dependencies
We develop and test Countly on Ubuntu with MongoDB, Node.js and nginx. Installation script only needs a clean, decent Ubuntu Linux without any services listening to port 80 and takes care of every library and software (e.g MongoDB, Nginx, Node.js, Expressjs etc) required to be installed on Ubuntu Linux.

Countly community also provides scripts to install Countly on [Mac OS X](http://support.count.ly/discussions/questions/161-can-i-install-countly-on-a-mac-server)  or [Debian Wheezy](https://gist.github.com/cbess/6221635)

##How do I upgrade my Countly server?

countly-server package includes an upgrade script (`bin/countly.upgrade.sh`) that takes care of the upgrade process.

##API & Frontend

Quick overview of some important files and directories included in this package;

####1. frontend/express/app.js

Countly dashboard that runs on Express server.

####2. frontend/express/public/javascripts/countly
Contains seperate  helper js files for each data visualization. For example `countly.session.js` is responsible for calculating session related metrics and interacts with `api/api.js` to retrieve data from the sessions collection.

####3. api/api.js

Countly write and read API. Waits for write requests from the mobile SDKs and read requests from the 
Countly js helpers. Refer to [Countly Server API Reference](http://count.ly/resources/reference/server-api) for details.

##How can I help you with your efforts?
Glad you asked. We need ideas, feedbacks and constructive comments. All your suggestions will be taken care with upmost importance. 

We are on [Twitter](http://twitter.com/gocountly) and [Facebook](http://www.facebook.com/Countly) if you would like to keep up with our fast progress!

##Links

* [Countly web page](http://count.ly)
* [Countly support](http://support.count.ly)
* [Countly Enterprise & Cloud Edition](https://count.ly/products/editions/)
* [Resources and documentation](http://count.ly/resources)
* [Packages on Sourceforge for direct download](http://sf.net/projects/countly)

