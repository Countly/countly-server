#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

countly stop

#upgrade existing plugins
countly plugin upgrade push
countly plugin upgrade live

countly plugin enable times-of-day

#update web-sdk
countly update sdk-web

#install dependencies, process files and restart countly
countly upgrade

countly start