#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#add indexes
nodejs $DIR/upgrade/17.05/removeOld.js

#upgrade all plugins
bash $DIR/scripts/countly.install.plugins.sh

#update web-sdk
countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade
