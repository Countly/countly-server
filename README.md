<p align="center">
  <img width="auto" src="https://cms.count.ly/uploads/countly_github_56791635fe.png?updated_at=2023-04-05T09:56:43.491Z"/>
</p>

![CI](https://github.com/countly/countly-server/actions/workflows/main.yml/badge.svg)
![CodeQL Analysis](https://github.com/countly/countly-server/actions/workflows/codeql-analysis.yml/badge.svg)

## 🔗 Quick links

* [Countly Website](https://countly.com)
* [Countly Server installation guide](https://support.countly.com/hc/en-us/articles/360036862332-Installing-the-Countly-Server)
* [Countly SDKs, download and documentation links](https://support.countly.com/hc/en-us/articles/360037236571-Downloading-and-Installing-SDKs)
* [Countly Community on Discord](https://discord.gg/countly)
* [User Guides for Countly features](https://support.countly.com/hc/en-us/sections/360007405211-User-Guides)

## 🌟 What is Countly?

Countly is a **privacy-first, AI-ready analytics and customer engagement platform** built for organizations that require **full data ownership and deployment flexibility**.

Unlike traditional SaaS-only analytics tools, Countly can be deployed **on-premises or in a private cloud**, giving you complete control over your data, infrastructure, compliance, and security.

Teams use Countly to:
* Understand user behavior across **mobile, web, desktop, and connected devices**
* Optimize product and customer experiences in **real time**
* Automate and personalize customer engagement across channels

With **flexible data tracking**, **customizable dashboards**, and a **modular plugin-based architecture**, Countly scales with your product while ensuring long-term autonomy and zero vendor lock-in.

**Built for privacy. Designed for flexibility. Ready for AI-driven innovation.**

## 🚀 Countly Plans                  

**Countly Lite**
* Core analytics and essential features
* Free to use under an open-source, non-commercial license
* Self-hosted deployment
* Ideal for individuals and small teams

**Countly Enterprise**
* Full analytics and engagement suite
* Advanced features, granular data access, SLA, and direct support
* Available as self-hosted or managed/private cloud
* Ideal for medium and large organizations with advanced compliance needs

**Countly Flex**
* Fully managed SaaS experience with dedicated Countly servers
* Region-based hosting selection
* Enterprise-grade features included, with optional add-ons
* Ideal for individuals and small-to-medium organizations wanting flexibility without infrastructure management

:pushpin: **Note**: Countly SDKs are identical across all editions.

For a detailed comparison of different editions [please check here](https://countly.com/pricing). To try the Countly Flex [please visit this page]([https://countly.com/flex](https://countly.com/flex)).

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

* [List of Countly SDKs, documentation and download information](https://support.countly.com/hc/en-us/articles/360037236571-Downloading-and-Installing-SDKs)
* [SDK development guide to build your own SDK](https://support.countly.com/hc/en-us/articles/360037753291-SDK-development-guide)
* [Countly Server Write API to send data into Countly from any source](https://api.count.ly/reference/i)

## 🛠️ Installing and upgrading Countly server

Countly installation script assumes it is running on a fresh Ubuntu/CentOS/RHEL Linux without any services listening on port 80 or 443 (which should also be open to incoming traffic), and takes care of every library and software required to be installed for Countly to run.

There are several ways to install Countly:

1. The following command will download and install Countly on your **Ubuntu** or **CentOS** server.

   `wget -qO- https://c.ly/install | bash`

2. For bash lovers, we provide a beautiful installation script (`bin/countly.install.sh`) in countly-server package which installs everything required to run Countly Server. For this, you need a stable release of this repository [available here](https://github.com/Countly/countly-server/releases).

3. Countly Lite also has Docker support - [see our official Docker repository](https://registry.hub.docker.com/r/countly/countly-server/) and [installation instructions for Docker](https://support.countly.com/hc/en-us/articles/360036862332-Installing-the-Countly-Server).

If you want to upgrade Countly from a previous version, please take a look at [upgrading documentation](https://support.countly.com/hc/en-us/articles/360037443652-Upgrading-the-Countly-Server).

## 🧩 API, extensibility and plugins

Countly has a [well-defined API](https://api.count.ly), that reads and writes data from/to the Countly backend. Countly dashboard is built using the read API, so it's possible to fetch any information you see on the dashboard using the API.

Countly is extensible using the plugin architecture. If you would like to modify any exiting feature by extending it or changing it, or if you would like to add completely new capabilities to Countly you can modify existing plugins or create new ones. We suggest [you read this document](https://support.countly.com/hc/en-us/articles/360036862392-Introduction) if you would like to start with plugin development.

## 💚 Community

We have a new Discord Server (new as of Apr 2023) for our community 🎉 [Please join us](https://discord.gg/countly) for any support requests, feature ideas, to showcase the application you are working on and for some occasional fun :)

## 🔒 Security

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and **not by creating a GitHub issue**.

## 🏗️ Built with

* **MongoDB** — One of the most popular NoSQL databases
* **NodeJS** — An open-source, cross-platform JavaScript runtime environment
* **Linux** — What we all love using ;-)

Plus lots of [open source libraries](https://support.countly.com/hc/en-us/articles/360037092232-Open-source-components)!         

## 📚 Developer Documentation

* [Coding Guidelines](CODING_GUIDELINES.md) — Development standards and best practices
* [Security Guidelines](docs/SECURITY.md) — Security requirements for contributions
* [Vue.js Guidelines](docs/VUEJS_GUIDELINES.md) — Frontend development patterns
* [CSS Style Guide](docs/CSS_STYLE_GUIDE.md) — SASS, BEM, and Bulma conventions
* [UI Testing Guide](docs/UI_TESTING.md) — Cypress testing and data-test-id usage
* [Test Suite Documentation](test/README.md) — Running and writing tests

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


## License
This project is licensed under **AGPL-3.0** with modified Section 7., see the [LICENSE](LICENSE) file for more details.

## 💚 Thanks

This project is tested with BrowserStack.
