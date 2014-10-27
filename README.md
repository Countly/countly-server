#Countly [![Build Status](https://api.travis-ci.org/Countly/countly-server.png)](https://travis-ci.org/Countly/countly-server)

**We're hiring:** Countly is looking for developers to work on its core platform. Send us an email (hello at count.ly), including your past experience about Javascript & Node.js, together with Github account name. 

##What's Countly?
[Countly](http://count.ly) is an innovative, real-time, open source mobile analytics application. 
It collects data from mobile phones, tablets and other internet-connected devices, and visualizes this information to analyze mobile application usage and end-user behavior. There are two parts of Countly: the server that collects and analyzes data, and mobile SDK that sends this data.

This repository holds Countly Community Edition. For more information other versions (e.g Enterprise Edition), see [Editions page](https://count.ly/products/editions/)

![Countly dashboard screenshot](http://a.fsdn.com/con/app/proj/countly/screenshots/dashboard_without_realtime.png)

##Supported devices

[Countly](http://count.ly) supports top-notch devices, including iOS, Android, Windows Phone and Blackberry. You can find a list of [officially and community supported Countly SDK libraries here](https://count.ly/resources/source/download-sdk). Each SDK has its own installation instructions.

##Installing Countly server

You can either download all files from [Sourceforge](http://sf.net/projects/countly), or get code from Github (this page).
 
We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you feel like doing things manually, or need to upgrade Countly from a previous version, please take a look at the installation articles from [http://resources.count.ly](http://resources.count.ly "Countly resources page").

##Dependencies
We develop and test Countly on Ubuntu with MongoDB, Node.js and nginx. Installation script only needs a clean, decent Ubuntu Linux without any services listening to port 80 and takes care of every library and software (e.g MongoDB, Nginx, Node.js, Expressjs etc) required to be installed on Ubuntu Linux.

Countly Community also provides scripts to install Countly on [Mac OS X](http://support.count.ly/discussions/questions/161-can-i-install-countly-on-a-mac-server)  or [Debian Wheezy](https://gist.github.com/cbess/6221635)

##How do I upgrade my Countly server?

Refer to [upgrading Countly documentation](https://count.ly/resources/upgrade/countly-server-upgrade) on Resources page.

##API & Frontend

[API documentation can be found here](http://resources.count.ly).

Other important files are `frontend/express/app.js` (Countly dashboard that runs on Express server), `frontend/express/public/javascripts/countly` (Contains seperate helper js files for each data visualization),  `countly.session.js` (responsible for calculating session related metrics) and `api/api.js`, which is Countly write and read API. Waits for write requests from the mobile SDKs and read requests from the 
Countly js helpers. 

##How can I help you with your efforts?
See our section on [how to contribute to Countly](http://github.com/countly/countly-server/CONTRIBUTING.md)

##Links

* [Countly web page](http://count.ly)
* [Countly support](http://support.count.ly)
* [Documentation & user guide](http://resources.count.ly)
* [Countly API reference guide](http://resources.count.ly)
* [Countly Enterprise & Cloud Edition](https://count.ly/products/editions/)
* [Packages on Sourceforge for direct download](http://sf.net/projects/countly)

