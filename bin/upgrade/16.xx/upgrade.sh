#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#upgrade live plugin if it is installed
countly plugin upgrade live

countly update sdk-web
countly upgrade