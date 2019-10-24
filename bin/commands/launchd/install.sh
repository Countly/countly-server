#!/bin/bash

sudo cp /usr/local/Cellar/mongodb/2.2.0-x86_64/homebrew.mxcl.mongodb.plist /Library/LaunchDaemons/
sudo cp com.countly.dashboard.plist /Library/LaunchDaemons/
sudo cp com.countly.api.plist /Library/LaunchDaemons/

sudo launchctl load homebrew.mxcl.mongodb.plist
sudo launchctl load com.countly.dashboard.plist
sudo launchctl load com.countly.api.plist