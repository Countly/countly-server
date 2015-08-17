#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

sudo cp com.countly.dashboard.plist /Library/LaunchDaemons/
sudo cp com.countly.api.plist /Library/LaunchDaemons/

sudo launchctl load com.countly.dashboard.plist
sudo launchctl load com.countly.api.plist