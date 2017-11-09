#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

countly stop

#upgrade existing plugins
countly plugin upgrade push
countly plugin upgrade live

nodejs $DIR/upgrade/17.12/scripts/removeUnusedData.js
    
set -e
nodejs $DIR/upgrade/17.12/scripts/process_users_meta.js
set +e

#update web-sdk
countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade

countly start