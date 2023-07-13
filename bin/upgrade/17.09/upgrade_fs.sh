#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

#change nginx config
echo "Changing nginx.conf file to increase upload limit"
echo "You can find your old conf file at $DIR/config/nginx.conf.backup.pre.17.09"
cp /etc/nginx/nginx.conf "$DIR/config/nginx.conf.backup.pre.17.09"
cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf
sudo nginx -s reload

#upgrade existing plugins
countly plugin upgrade push

#enable new plugins
countly plugin enable alerts
countly plugin enable cohorts
countly plugin enable crash_symbolication
countly plugin enable groups
countly plugin enable plugin-upload
countly plugin enable white-labeling

#update web-sdk
countly update sdk-web

#install dependencies, process files and restart countly
countly upgrade