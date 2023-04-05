<p align="center">
  <img width="auto" src="https://cms.count.ly/uploads/countly_github_56791635fe.png?updated_at=2023-04-05T09:56:43.491Z"/>
</p>

![CI](https://github.com/countly/countly-server/actions/workflows/main.yml/badge.svg)
![CodeQL Analysis](https://github.com/countly/countly-server/actions/workflows/codeql-analysis.yml/badge.svg)

## 🔗 Quick links

* [Countly Website](https://countly.com)
* [Countly Server installation guide](https://support.count.ly/hc/en-us/articles/360036862332-Installing-the-Countly-Server)
* [Countly SDKs, download and documentation links](https://support.count.ly/hc/en-us/articles/360037236571-Downloading-and-Installing-SDKs)
* [Countly Community on Discord](https://discord.gg/countly)
* [User Guides for Countly features](https://support.count.ly/hc/en-us/sections/7039354168729-User-Guides-Countly-22-x)

## 🌟 What is Countly?

Countly is a product analytics platform that helps teams track, analyze and act on their user actions and behaviour on mobile, web and desktop applications. 

Countly is used to track 1.5B unique identities on more than 16,000 applications via 2,000+ servers worldwide. It securely processes billions of data points every day in the cloud and on-premises, enabling teams of all sizes to build better applications and engaging experiences while maintaining full control over their product analytics data flow.

One-minute video introduction to Countly Community Edition (opens Youtube):

[![Countly Community Edition - Video](https://count.ly/github/countly-community-1min-v1808.png?v3)](https://youtu.be/htKeh9bsZwA)

## 🚀 What are the Countly editions?                   

* **Community Edition** — Essential plugins/features and a free-to-use, open source, non-commercial license. Available as self-hosted. Suitable for individuals and small organizations.
* **Enterprise Edition:** — Offers a wider range of plugins/features, granular data, an SLA, and direct support. Available as self-hosted or Countly hosted/managed. Suitable for medium and large organizations.
* **myCountly** — Our SaaS platform that is live for alpha testing. Offers some Enterprise features as core features, and some others as add-ons. Everyone gets their dedicated and fully-managed Countly server(s) in the region they choose. Suitable for individuals, small and medium organizations.  

For a detailed comparison of Community and Enterprise Editions [please check here](https://countly.com/pricing). To join the myCountly wait list [please visit this page](https://countly.com/mycountly).

Also, please note that SDKs of Countly are the same for all editions.

## 📦 What is included in this repository?

This repository includes server-side part of Countly, with the following features: 

* Session, view and event collection and reporting
* Crash/error reporting for iOS, Android, React Native, Flutter, NodeJS, Unity, Java and Javascript
* Rich and interactive push notifications for iOS and Android
* Remote configuration to adjust your app's logic, appearance, and behavior on the fly
* In-app ratings with customizable widgets
* Built in reports and customizable dashboards
* Email reports and alerts
* Hooks to send the data to external parties via email or webhooks
* Data Manager to plan and manage events and event segmentations
* Compliance Hub for consent collection and data subject request management
* User, application and permission management
* Read and write APIs
* Plugin based architecture for easy customization

![content](https://count.ly/github/countly-highlights.png?v3)

## 📈 What can Countly track?

Countly can collect and visualize data from mobile, web and desktop applications. Using the write-API you can send data into Countly from any source. For more information please check the below resources: 

* [List of Countly SDKs, documentation and download information](https://support.count.ly/hc/en-us/articles/360037236571-Downloading-and-Installing-SDKs)
* [SDK development guide to build your own SDK](https://support.count.ly/hc/en-us/articles/360037753291-SDK-development-guide)
* [Countly Server Write API to send data into Countly from any source](https://api.count.ly/reference/i)

## 🛠️ Installing and upgrading Countly server

Countly installation script assumes it is running on a fresh Ubuntu/CentOS/RHEL Linux without any services listening on port 80 or 443 (which should also be open to incoming traffic), and takes care of every library and software required to be installed for Countly to run.

There are several ways to install Countly:

1. The following command will download and install Countly on your **Ubuntu** or **CentOS** server.

   `wget -qO- https://c.ly/install | bash`

2. For bash lovers, we provide a beautiful installation script (`bin/countly.install.sh`) in countly-server package which installs everything required to run Countly Server. For this, you need a stable release of this repository [available here](https://github.com/Countly/countly-server/releases).

3. Countly Community Edition also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/r/countly/countly-server/) and [installation instructions for Docker](https://support.count.ly/hc/en-us/articles/360036862332-Installing-the-Countly-Server).

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](https://support.count.ly/hc/en-us/articles/360037443652-Upgrading-the-Countly-Server).

## 🧩 API, extensibility and plugins

Countly has a [well-defined API](https://api.count.ly), that reads and writes data from/to the Countly backend. Countly dashboard is built using the read API, so it's possible to fetch any information you see on the dashboard using the API.

Countly is extensible using the plugin architecture. If you would like to modify any exiting feature by extending it or changing it, or if you would like to add completely new capabilities to Countly you can modify existing plugins or create new ones. We suggest [you read this document](https://support.count.ly/hc/en-us/articles/360036862392-Introduction) if you would like to start with plugin development.

## 🔒 Security

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and **not by creating a GitHub issue**.

## 🏗️ Built with

* **MongoDB** — One of the most popular NoSQL databases
* **NodeJS** — An open-source, cross-platform JavaScript runtime environment
* **Linux** — What we all love using ;-)

Plus lots of [open source libraries](https://support.count.ly/hc/en-us/articles/360037092232-Open-source-components)!         

## 🤝 How can I help you with your efforts?

1. Fork this repo
2. Create your feature branch (`git checkout -b my-new-super-feature`)
3. Commit your changes (`git commit -am 'Add some cool feature'`)
4. Push to the branch (`git push origin my-new-super-feature`)
5. Create a new pull request

Also, you are encouraged to read an extended contribution section on [how to contribute to Countly](https://github.com/Countly/countly-server/blob/master/CONTRIBUTING.md).

## 👍 Badges

If you like Countly, why not use one of our badges and give a link back to us?

<a href="https://countly.com/?utm_source=badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg?v2" alt="Countly - Product Analytics" /></a>

    <a href="https://countly.com/?utm_source=badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/dark.svg" alt="Countly - Product Analytics" /></a>

<a href="https://countly.com/?utm_source=badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg?v2" alt="Countly - Product Analytics" /></a>

    <a href="https://countly.com/?utm_source=badge" rel="nofollow"><img style="width:145px;height:60px" src="https://count.ly/badges/light.svg" alt="Countly - Product Analytics" /></a>
