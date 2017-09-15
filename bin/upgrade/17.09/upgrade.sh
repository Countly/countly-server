#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#rename config property
WARN="$(countly config "logs.warning")"
countly config "logs.warning" null
countly config "logs.warn" $WARN

#change nginx config
echo "Changing nginx.conf file to increase upload limit"
echo "You can find your old conf file at $DIR/config/nginx.conf.backup.pre.17.09"
cp /etc/nginx/nginx.conf $DIR/config/nginx.conf.backup.pre.17.09
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
/etc/init.d/nginx restart

#enable new plugins
countly plugin enable cohorts
countly plugin enable crash_symbolication
countly plugin enable groups
countly plugin enable plugin-upload
countly plugin enable white-labeling

#update web-sdk
countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade