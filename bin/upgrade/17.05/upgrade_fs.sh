#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

#upgrade all plugins
bash "$DIR/scripts/countly.install.plugins.sh"

#enable new plugins
countly plugin enable dashboards
countly plugin enable assistant
countly plugin enable flows

#update web-sdk
countly update sdk-web

#install dependencies, process files and restart countly
countly upgrade
