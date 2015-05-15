#Countly [![Build Status](https://api.travis-ci.org/Countly/countly-server.png)](https://travis-ci.org/Countly/countly-server) [![Gitter chat](https://badges.gitter.im/CountlyAnalytics/countly-server.png)](https://gitter.im/CountlyAnalytics/countly)


**We're hiring:** Countly is looking for full stack node.js developers to work on its core platform. [Click this link for job description](https://count.ly/full-stack-node-js-developer/)

**Note:** [A bug with installer](https://github.com/Countly/countly-server/issues/143) prevents Countly running under Ubuntu 15.04. Please use Ubuntu 13 or 14 series for now.

##What's Countly?
[Countly](http://count.ly) is an innovative, real-time, open source mobile analytics and push notifications platform. It collects data from mobile phones, tablets, [Apple Watch](http://blog.count.ly/post/119031457543/countly-on-apple-watch) and other internet-connected devices, and visualizes this information to analyze mobile application usage and end-user behavior. There are two parts of Countly: the server that collects and analyzes data, and mobile SDK that sends this data.

This repository includes Countly Community Edition. For more information other versions (e.g Enterprise Edition), see [comparison of different Countly editions](https://count.ly/compare)

![Countly dashboard screenshot](http://a.fsdn.com/con/app/proj/countly/screenshots/dashboard_without_realtime.png)

##Supported devices

[Countly](http://count.ly) supports top-notch devices, including iOS, Android and Windows Phone. You can find a list of [officially and community supported Countly SDK libraries here](https://count.ly/resources/source/download-sdk). Each SDK has its own installation instructions.

##Installing & upgrading Countly server

All public Community Edition versions are [available from Github](https://github.com/Countly/countly-server/releases). We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](resources.count.ly/v1.0/docs/upgrading-countly-server).

Countly also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/u/countly/countly-server/)

##Dependencies
We develop and test Countly on Ubuntu with MongoDB, Node.js and nginx. Installation script only needs a clean, decent Ubuntu Linux without any services listening to port 80 and takes care of every library and software (e.g MongoDB, Nginx, Node.js, Expressjs etc) required to be installed on Ubuntu Linux.

##API & Frontend

[API documentation can be found here](http://resources.count.ly).

Countly has a well defined API, that reads from or writes to Node.js. Dashboard is built using this API, so it's possible to fetch any kind of information from Node process directly using Countly API. For those who are interested with building their own dashboard; important files are `frontend/express/app.js` (Countly dashboard that runs on Express server), `frontend/express/public/javascripts/countly` (Contains seperate helper js files for each data visualization),  `countly.session.js` (responsible for calculating session related metrics) and `api/api.js`, which is Countly write and read API. 

##How can I help you with your efforts?
See our section on [how to contribute to Countly](https://github.com/Countly/countly-server/blob/master/CONTRIBUTING.md)

##Links

* [Countly web page](http://count.ly)
* [Countly support](http://support.count.ly)
* [Documentation & API reference guide](http://resources.count.ly)
* [Countly Enterprise & Cloud Edition](https://count.ly/compare)
