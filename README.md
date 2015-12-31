#Countly [![Build Status](https://api.travis-ci.org/Countly/countly-server.png?branch=master)](https://travis-ci.org/Countly/countly-server) 

**HEY! We're hiring:** Countly is looking for full stack node.js developers to work on its core platform. [Click this link for job description](https://count.ly/full-stack-node-js-developer/)

##What's Countly?
[Countly](http://count.ly) is an innovative, real-time, open source mobile & [web analytics](http://count.ly/web-analytics), [push notifications](http://count.ly/push-notifications) and [crash reporting](http://count.ly/crash-reports) platform powering nearly 3000 mobile applications. It collects data from mobile phones, tablets, Apple Watch and other internet-connected devices, and visualizes this information to analyze mobile application usage and end-user behavior. 

With the help of [Javascript SDK](http://github.com/countly/countly-sdk-web), Countly is a web analytics platform with features on par with mobile SDKs. For more information about web analytics capabilities, [see this link](http://count.ly/web-analytics).

There are two parts of Countly: the server that collects and analyzes data, and an SDK (mobile, web or desktop) that sends this data. This repository includes Countly Community Edition (server side). For more information other versions (e.g Enterprise Edition), see [comparison of different Countly editions](https://count.ly/compare)

![Countly dashboard screenshot](http://a.fsdn.com/con/app/proj/countly/screenshots/dashboard_without_realtime.png)

##Supported devices

[Countly](http://count.ly) supports top-notch devices, including iOS, Android, Windows Phone and web apps. You can find a list of [official and community supported Countly SDK libraries here](https://count.ly/resources/source/download-sdk). Each SDK has its own installation instructions.

##Installing & upgrading Countly server

All public Community Edition versions are [available from Github](https://github.com/Countly/countly-server/releases). We provide a beautiful installation sript (`bin/countly.install.sh`) with countly-server package that installs and configures everything required to run Countly Server.

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](resources.count.ly/v1.0/docs/upgrading-countly-server).

Countly also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/u/countly/countly-server/) and [installation instructions for Docker](http://resources.count.ly/docs/installing-countly-server)

##Dependencies

We develop and test Countly on Ubuntu with MongoDB, Node.js and Nginx. Installation script only needs a clean, decent Ubuntu Linux without any services listening to port 80 and takes care of every library and software (e.g MongoDB, Nginx, Node.js, Expressjs etc) required to be installed on Ubuntu Linux. 

##API & Frontend

Countly has a [well defined API](http://resources.count.ly), that reads from or writes to Node.js. Dashboard is built using this API, so it's possible to fetch any kind of information from Node process directly using Countly API. For those who are interested with building their own dashboard; important files are:

- `frontend/express/app.js`, Countly dashboard that runs on Express server 
- `frontend/express/public/javascripts/countly`, that contains seperate helper js files for each data visualization
- `countly.session.js`, responsible for calculating session related metrics and 
- `api/api.js`, which is Countly write and read API. 

Countly is extensible with [plugins](http://count.ly/plugins). We suggest [you read this document](http://resources.count.ly/docs/plugins-development-introduction) and start writing your plugin. We support companies with know-how in need to write their own plugins.

##How can I help you with your efforts?

1. Fork this repo
2. Create your feature branch (`git checkout -b my-new-super-feature`)
3. Commit your changes (`git commit -am 'Add some cool feature'`)
4. Push to the branch (`git push origin my-new-super-feature`)
5. Create a new pull request

Also, you are encouraged to read an extended contribution section on [how to contribute to Countly](https://github.com/Countly/countly-server/blob/master/CONTRIBUTING.md)

And, if you liked Countly, [why not use one of our badges](https://count.ly/brand-assets/) and give a link back to us, so others know about this wonderful platform? 

![Light badge](https://count.ly/wp-content/uploads/2014/10/countly_badge_5.png)  ![Dark badge](https://count.ly/wp-content/uploads/2014/10/countly_badge_6.png)

##Links

* [Countly web page](http://count.ly)
* [Countly support](http://support.count.ly)
* [Documentation & API reference guide](http://resources.count.ly)
* [Countly Enterprise & Cloud Edition](https://count.ly/compare)
* [Extended features of Countly Enterprise Edition](https://count.ly/enterprise-edition-features), including crash reports, referral analytics, user profiles, geolocations with push, detailed segmentation, funnels, real-time dashboard and more.
