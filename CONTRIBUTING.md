
# Contributing to Countly

Countly is a big project benefiting from plugin support to make contributions easy, and we are happy to receive contributors with different skills: 

* If you know Javascript and HTML5/CSS you can contribute to core layer and user interface of Countly. 
* If you know MongoDB and Node.js, you can contribute to database layer. 
* If you know Java, you can contribute to [Countly Android SDK](https://github.com/countly/countly-sdk-android). 
* If you know Objective-C, you can contribute to [Countly iOS SDK](https://github.com/countly/countly-sdk-ios). 
* If you know any other language, you can start writing your own SDK and help others use Countly as a backend. 
[Here's a list of SDKs that Countly supports](http://resources.count.ly/v1.0/docs/downloading-sdks).

## Contribution areas 

You can always send a pull request to Countly Community Edition or to Countly SDKs for the following: 

* New features, small or big, including installation, integration, tests, user interface, user experience, extra platforms and such.  
* Bugfixes (excluding translations, explained below) 
* Inefficient code
* Documentation (including installation, deployment to various platforms, video training) 

Before sending a pull request, we expect you first check 
[all new issues](https://github.com/countly/countly-server/issues/) before putting your effort. It's also better to 
test your code thoroughly before sending it over. Also please check existing code to have an understanding of how we work. 

Before starting, you may want to check Github's guide on [contributing open source projects](https://guides.github.com/activities/contributing-to-open-source/).

## Translations

All translations take place on [Transifex Countly page](transifex.com/projects/p/countly). Please check if your language 
is not there, or has a small percentage of translation. Create your account and apply to be a translator. 

## Setting up a Development Environment

Whether you want to start working on developing a new plugin, or some feature/ issue on the Countly Server itself, you will need a development environment to test your code on. 

_Note: you will need [Vagrant](https://www.vagrantup.com/) and [Virtualbox](https://www.virtualbox.org/wiki/Downloads) installed._

1. Start a VM on your machine, with `vagrant up`. 
1. Log into the VM, with `vagrant ssh`
1. Use the standard `countly start` / `countly restart` / etc. commands
1. Logs are available in `/opt/countly/logs`
1. (Optional) You might additionally want to enable the [debugger](https://resources.count.ly/v1.0/docs/debugging). 


## Add a badge to your site

If you like Countly, [why not use one of our badges](https://count.ly/brand-assets/) and give a link back to us, so others know about this wonderful platform? 

### Small badges

![Light badge](https://count.ly/wp-content/uploads/2014/10/countly_badge_5.png)  ![Dark badge](https://count.ly/wp-content/uploads/2014/10/countly_badge_6.png)

### Big badges

![Badge 1](https://count.ly/wp-content/uploads/2014/10/countly_badge_1.png) ![Badge 2](https://count.ly/wp-content/uploads/2014/10/countly_badge_2.png) ![Badge 3](https://count.ly/wp-content/uploads/2014/10/countly_badge_3.png) ![Badge 4](https://count.ly/wp-content/uploads/2014/10/countly_badge_4.png)

