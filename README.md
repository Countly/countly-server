
# Countly Analytics [![Build Status](https://api.travis-ci.org/Countly/countly-server.png?branch=master)](https://travis-ci.org/Countly/countly-server) [![Install Countly on DigitalOcean](https://do.count.ly/button.svg?v2)](http://do.count.ly)

<br/>

![header2](https://count.ly/github/countly-editions.png?v2)

<br/>

* **We're hiring:** Countly is looking for full stack developers (remote work). [Check out available openings here](https://angel.co/countly/jobs).
* **Slack user?** [Join our Slack community](https://slack.count.ly)
* **Questions?** [Ask in our Community forum](http://community.count.ly)

## What's Countly?
[Countly](http://count.ly) is an innovative, real-time, open source [mobile](https://count.ly/mobile-analytics) & [web analytics](http://count.ly/web-analytics), [rich push notifications](https://count.ly/plugins/rich-push-notifications) and [crash reporting](https://count.ly/plugins/crash-analytics) platform powering more than 2500 web sites, 14000 mobile applications and several tens of thousands of desktop applications as of 2017 Q3. It collects data from mobile, desktop, web apps including Apple Watch, TvOS and other internet-connected devices, and visualizes this information to analyze application usage and end-user behavior. 

With the help of [Javascript SDK](http://github.com/countly/countly-sdk-web), Countly is a web analytics platform with features on par with mobile SDKs. For more information about web analytics capabilities, [see this link](http://count.ly/web-analytics).

There are two parts of Countly: the server that collects and analyzes data, and an SDK (mobile, web or desktop) that sends this data. This repository includes Countly Community Edition (server side). For more information other versions (e.g Enterprise Edition), see [comparison of different Countly editions](https://count.ly/pricing#compare-editions)

Click on the below image for a 1 minute video introduction to Countly (opens Youtube);

[![Countly Community Edition - Video](https://count.ly/github/countly-community-1min.png)](https://youtu.be/htKeh9bsZwA)


## What is included? 

This repository includes server-side part of Countly, with following features: 

* Complete dashboard user interface
* User, application and permission management
* Read / write APIs
* Plugin based system
* Analytics features for [mobile](https://count.ly/mobile-analytics), [web](https://count.ly/web-analytics) and [desktop](https://count.ly/desktop-analytics)
* [Crash reporting](https://count.ly/plugins/crash-analytics) for iOS & Android and error reporting for Javascript
* [Rich and interactive push notifications](https://count.ly/plugins/rich-push-notifications) for iOS & Android
* Email reporting

![content](https://count.ly/github/countly-highlights.png)

## What can Countly track? 

[Countly](https://count.ly) can collect and visualize data from iOS, Android, Windows Phone devices, desktop applications (Windows, Mac OS) and web applications. You can find a list of [official and community supported Countly SDK libraries here](https://resources.count.ly/docs/downloading-sdks). Each SDK has its own installation instructions.

## Built with 

* **MongoDB** One of the most popular NoSQL databases
* **Node.js** An open-source, cross-platform JavaScript runtime environment for developing a diverse variety of tools and applications.
* **Express.js** Popular Node.js web application framework 
* **Linux** What we love using ;-)

Plus lots of [open source libraries](http://resources.count.ly/docs/list-of-open-source-components-in-countly)!

## Security

We take security very seriously at Countly. Community Edition code is 100% open source and peer reviewed, to ensure nobody's Countly instance is ever compromised or hacked. If you wish to report a security issue, please email security@count.ly

## What makes Countly unique? 

Countly is a privacy-focused and 360-degree analytics approach with several, unique values:

* Real-time mobile analytics, web analytics and push notifications.
* Your data, your rules - since you can install Countly on your own server, or let us do a private cloud deployment for you.
* Configurable and extensible via open source [plugins](https://count.ly/plugins).
* Modern and easy to use web dashboard with a focus on user experience, helping to get complex insights easily.
* Tracking more than 2500 web sites and 14000 mobile applications.
* Collecting more than 60 billion datapoints worlwide.

## Differences between Community Edition & Enterprise Edition

* **Audience:** Community Edition is for product managers, developers and analytics enthusiasts, whereas banks, operators, healthcare companies and businesses that run the world's leading websites choose Enterprise Edition.
* **Deployment:** Community Edition deployments are for environments where the information stored is not critical since it does not include professional assistance. You must have a qualified technician. Enterprise Edition is for corporate environments that require availability and reliability where intellectual capital is critical.
* **Technology:** Community Edition has a number of limitations, including no corporate support for sharding, replica sets or installation.
* **Guarantee:** Community Edition is on the bleeding edge regarding version upgrades and with no bugfix guarantee. Enterprise Edition has bugfix guarantee, immediate resolution, verified builds, on-site and automatic version upgrades.
* **Features:** Enterprise Edition has more features compared to Countly, with a focus on end-to-end analytics and marketing platform. Additional features include but not limited to automated push notifications, drilling on the raw data, user profiles, in-app purchase analytics, retention & engagement, user flows, cohorts and custom dashboards.

## Installing & upgrading Countly server

Countly installation script assumes it is running on a fresh, decent Ubuntu/CentOS/RHEL Linux without any services listening on port 80 or 443 (which should also be open to incoming traffic), and takes care of every library and software required to be installed for Countly to run. 

There are several ways to install Countly: 

1. The following command will download and install Countly on your **Ubuntu** or **CentOS** server. 

    `wget -qO- http://c.ly/install | bash`

2. If you have a Digital Ocean account, [click here and install on Digital Ocean](http://do.count.ly) with a single click.

3. For bash lovers, we provide a beautiful installation script (`bin/countly.install.sh`) in countly-server package which installs everything required to run Countly Server. For this, you need a stable release of this repository [available here](https://github.com/Countly/countly-server/releases). 

4. Countly Community Edition also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/u/countly/countly-server/) and [installation instructions for Docker](http://resources.count.ly/docs/installing-countly-server)

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](http://resources.count.ly/v1.0/docs/upgrading-countly-server).

## API & Frontend

Countly has a [well defined API](http://resources.count.ly), that reads and writes data from/to the Countly backend. Dashboard is built using the read API, so it's possible to fetch any information you see on the dashboard using the Countly API. If you are interested in creating new reports or visualisations in the UI, we recommend checking out the next section for creating plugins.

## Extensibility & plugins 

Countly is extensible using the [plugin architecture](https://count.ly/plugins). We suggest [you read this document](http://resources.count.ly/docs/plugins-development-introduction) before creating your plugin. We provide support to companies with know-how in need to create their own plugins.

## How can I help you with your efforts?

1. Fork this repo
2. Create your feature branch (`git checkout -b my-new-super-feature`)
3. Commit your changes (`git commit -am 'Add some cool feature'`)
4. Push to the branch (`git push origin my-new-super-feature`)
5. Create a new pull request

Also, you are encouraged to read an extended contribution section on [how to contribute to Countly](https://github.com/Countly/countly-server/blob/master/CONTRIBUTING.md)

## Badges

If you liked Countly, [why not use one of our badges](https://count.ly/brand-assets) and give a link back to us, so others know about this wonderful platform? 

<a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg" alt="Countly - Product Analytics" /></a>

    <a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg" alt="Countly - Product Analytics" /></a>

<a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg" alt="Countly - Product Analytics" /></a>

    <a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg" alt="Countly - Product Analytics" /></a>

## Links

* [Our philosophy: Your Data, Your Rules](https://count.ly/your-data-your-rules)
* [Countly Plugin Marketplace](https://count.ly/plugins)
* [General product information](http://count.ly/product)
* [Questions? Ask in our forum](http://community.count.ly)
* [Watch training videos on Youtube](https://www.youtube.com/user/GoCountly/videos)
* [Slack user? Come chat with us](https://slack.count.ly)
* [Documentation & API reference](https://resources.count.ly)
* [Countly Enterprise vs Community Edition](https://count.ly/pricing#compare-editions)
