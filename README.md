
<h1 align="center"> Countly Analytics </h1>

<p align="right">

[![Build Status](https://api.travis-ci.org/Countly/countly-server.png?branch=master)](https://travis-ci.org/Countly/countly-server) [![Install Countly on DigitalOcean](https://count.ly/github/install-on-digital-ocean.svg)](http://do.count.ly)

</p>

<p align="center">

![header2](https://count.ly/github/countly-editions.png?v3)

</p>

<p align="center">
	<strong>
		<a href="https://count.ly/">Website</a>
		•
		<a href="https://resources.count.ly">Docs</a>
		•
		<a href="https://count.ly/try">Try demo</a>
        •
		<a href="https://slack.count.ly">Slack group</a>  
        •
		<a href="https://community.count.ly">Community forum</a>
	</strong>
</p>


## Table of Contents

- [What is Countly?](#what-is-countly)
- [What is included?](#what-is-included)
- [What can Countly track?](#what-can-countly-track)
- [What components does Countly have?](#built-with)
- [Security](#security)
- [What makes Countly unique?](#what-makes-countly-unique)
- [Differences between Community Edition & Enterprise Edition](#differences-between-community-edition--enterprise-edition)
- [Installing and upgrading Countly server](#installing-and-upgrading-countly-server)
- [API and Frontend](#api-and-frontend)
- [Extensibility and plugins](#extensibility-and-plugins)
- [How can I help you with your efforts?](#how-can-i-help-you-with-your-efforts)
- [Badges](#badges)
- [Links](#links)


## What is Countly?
[Countly](http://count.ly) is a product analytics solution and innovation enabler that helps teams track product performance and customer journey and behavior across [mobile](https://count.ly/mobile-analytics), [web](http://count.ly/web-analytics), and [desktop](https://count.ly/desktop-analytics) applications. [Ensuring privacy by design](https://count.ly/your-data-your-rules), Countly allows you to innovate and enhance your products to provide personalized and customized customer experiences, and meet key business and revenue goals.

Countly tracks 1.5B+ unique identities on more than 16,000 applications and using over 2,000 servers worldwide, making it a world leading product analytics platform. It securely processes billions of data points every day in the cloud and on-premise,  giving you full control over your data.

Countly relies on a wide diversity of SDKs for deployment and provides an extensive list of plugins and dozens of integrations, as well as features a clean and intuitive UI with an easy-to-use and customizable Dashboard. The platform is available in [two different editions](https://count.ly/pricing#compare-editions): Enterprise Edition, which offers a wider range of plugins, customizable SLA, and direct support; while Community Edition, with essential plugins and a free-to-use, open source, non-commercial license, lets you contribute new features, bug fixes, and optimize repositories, giving you the power to improve the product for yourself as well as for others.

And because data-flow security is critical, the Countly Dashboard enables you to not only access settings within your team but also provides a privacy-protection compliant environment, so you can focus on innovation with customer intelligence, without worrying about compliance.

**An analytics platform as it should be: secure data ownership to track, measure, and take action, all in one place.**

With Countly, understand your digital customer journey across devices. Build better ones.

Click on the below image for a 1 minute video introduction to Countly (opens Youtube);

[![Countly Community Edition - Video](https://count.ly/github/countly-community-1min-v1808.png?v3)](https://youtu.be/htKeh9bsZwA)


## What is included?

This repository includes server-side part of Countly, with following features: 

* Complete dashboard user interface
* User, application and permission management
* Read / write APIs
* Plugin based architecture
* Analytics features for [mobile](https://count.ly/mobile-analytics), [web](https://count.ly/web-analytics) and [desktop](https://count.ly/desktop-analytics)
* [Crash reporting](https://count.ly/plugins/crash-analytics) for iOS & Android and error reporting for Javascript
* [Rich and interactive push notifications](https://count.ly/plugins/rich-push-notifications) for iOS & Android
* Email reporting

![content](https://count.ly/github/countly-highlights.png?v3)

## What can Countly track?

[Countly](https://count.ly) can collect and visualize data from iOS, Android, Windows Phone devices, desktop applications (Windows, Mac OS) and web applications. You can find a list of [official and community supported Countly SDK libraries here](https://resources.count.ly/docs/downloading-sdks). Each SDK has its own installation instructions.

## Built with 

* **MongoDB** One of the most popular NoSQL databases
* **Node.js** An open-source, cross-platform JavaScript runtime environment
* **Express.js** Popular Node.js web application framework 
* **Linux** What we love using ;-)

Plus lots of [open source libraries](http://resources.count.ly/docs/list-of-open-source-components-in-countly)!

## Security

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and **not by creating a GitHub issue**.

## What makes Countly unique?

Countly is a privacy-focused and 360-degree analytics platform with several, unique values:

* Real-time mobile analytics, web analytics and push notifications.
* Complete data ownership and control - since you can install Countly on your own server, or let us do a private cloud deployment for you.
* Configurable and extensible via open source [plugins](https://count.ly/plugins).
* Modern and easy to use web based dashboard with a focus on user experience, which makes getting complex insights a breeze.
* Tracking more than 2500 web sites and 16000 mobile applications.
* Collecting more than 60 billion datapoints worldwide.

## Differences between Community Edition & Enterprise Edition

* **Audience:** Community Edition is suitable for individual developers and small development houses whereas Enterprise Edition is a better fit for companies that require more advanced analytics and marketing capabilities together with ongoing support.
* **Features:** Enterprise Edition has additional features compared to Community Edition including automated push notifications, advanced segmentation, user profiles, in-app purchase analytics, retention, user flows, behavioral cohorts and custom dashboards.
* **Data granularity:** Community Edition stores data (only) in an aggregated format, which reduces the required storage and makes reporting incredibly fast. Enterprise Edition takes advantage of the same format but also stores individual occurrences of data points which enables more advanced capabilities such as segmentation, funnels, user profiles and behavioral cohorts to name a few.
* **Working with raw data:** Granular data, exclusive to Enterprise Edition, enables customers to take advantage of external BI tools or work directly with MongoDB to process and report data as they need.
* **Deployment:** Running and maintaining a Community Edition instance requires technical know-how of several technologies including Linux, Nginx, Node.js and MongoDB. Whereas an Enterprise Edition hosted or on-premise subscription includes hands on support.
* **High availability and scalability:** Countly engineers provide active support to Enterprise Edition customers for deployment planning and realization of this plan including replica set, sharding and a load balanced deployment setup on-premises or on popular cloud environments such as Google Cloud, AWS and Azure.
* **Service-level agreement:** Enterprise Edition subscriptions include an SLA with response and issue resolution guarantees. Community Edition users can take advantage of the community forum or GitHub to post issues.

## Installing and upgrading Countly server

Countly installation script assumes it is running on a fresh, decent Ubuntu/CentOS/RHEL Linux without any services listening on port 80 or 443 (which should also be open to incoming traffic), and takes care of every library and software required to be installed for Countly to run. 

There are several ways to install Countly: 

1. The following command will download and install Countly on your **Ubuntu** or **CentOS** server. 

    `wget -qO- https://c.ly/install | bash`

2. If you have a Digital Ocean account, [click here and install on Digital Ocean](http://do.count.ly) with a single click.

3. For bash lovers, we provide a beautiful installation script (`bin/countly.install.sh`) in countly-server package which installs everything required to run Countly Server. For this, you need a stable release of this repository [available here](https://github.com/Countly/countly-server/releases). 

4. Countly Community Edition also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/r/countly/countly-server/) and [installation instructions for Docker](http://resources.count.ly/docs/installing-countly-server)

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](http://resources.count.ly/v1.0/docs/upgrading-countly-server).

## API and Frontend

Countly has a [well defined API](http://resources.count.ly), that reads and writes data from/to the Countly backend. Dashboard is built using the read API, so it's possible to fetch any information you see on the dashboard using the Countly API. If you are interested in creating new reports or visualisations in the UI, we recommend checking out the next section for creating plugins.

## Extensibility and plugins 

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

<a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg?v2" alt="Countly - Product Analytics" /></a>

    <a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg" alt="Countly - Product Analytics" /></a>

<a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg?v2" alt="Countly - Product Analytics" /></a>

    <a href="https://count.ly/f/badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg" alt="Countly - Product Analytics" /></a>

## Links

* [Our philosophy: Let Data Live](https://count.ly/your-data-your-rules)
* [Countly Plugin Marketplace](https://count.ly/plugins)
* [General product information](http://count.ly/product)
* [Questions? Ask in our forum](http://community.count.ly)
* [Watch training videos on Youtube](https://www.youtube.com/user/GoCountly/videos)
* [Slack user? Come chat with us](https://slack.count.ly)
* [Documentation & API reference](https://resources.count.ly)
* [Countly Enterprise vs Community Edition](https://count.ly/pricing#compare-editions)
