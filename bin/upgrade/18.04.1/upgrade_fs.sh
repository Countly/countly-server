#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

#upgrade existing plugins
countly plugin upgrade push

#enable new plugins
if [ ! -f "$DIR/../plugins/plugins.ee.json" ]; then
    countly plugin enable video-intelligence-monetization
fi
countly plugin enable alerts

#install dependencies, process files and restart countly
countly upgrade