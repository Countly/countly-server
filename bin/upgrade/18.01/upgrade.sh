#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

YUM_CMD=$(which yum)
APT_GET_CMD=$(which apt-get)
if [[ ! -z $APT_GET_CMD ]]; then
	apt-get install -y sqlite3
elif [[ ! -z $YUM_CMD ]]; then
	yum install -y sqlite
fi

countly stop

#upgrade existing plugins
countly plugin upgrade push
countly plugin upgrade live

countly plugin enable times-of-day

nodejs $DIR/upgrade/18.01/scripts/removeUnusedData.js
    
set -e
nodejs $DIR/upgrade/18.01/scripts/process_users_meta.js
set +e

#update web-sdk
countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade

countly start