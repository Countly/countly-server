#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

#upgrade existing plugins
countly plugin upgrade push

#enable new plugins
countly plugin enable compliance-hub

#install dependencies, process files and restart countly
countly upgrade