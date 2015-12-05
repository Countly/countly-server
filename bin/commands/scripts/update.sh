#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly update usage:";
    echo "    countly update translations   # get latest translation files";
    echo "    countly update geoip          # get latest geoip-lite translation files";
    echo "    countly update devices        # get latest list of device ids to device names";
    echo "    countly update sdk-web        # get latest version of web sdk";
} 
if [ "$1" = "translations" ]; then
    nodejs $DIR/update_translations.js ;
elif [ "$1" = "geoip" ]; then
    (cd $DIR/../../../node_modules/geoip-lite ; npm run-script updatedb ;)
elif [ "$1" = "devices" ]; then
    wget -q https://raw.githubusercontent.com/Countly/countly-localization/master/data/countly.device.list.js -O $DIR/../../../frontend/express/public/javascripts/countly/countly.device.list.js
elif [ "$1" = "sdk-web" ]; then
    mkdir -p $DIR/../../../frontend/express/public/sdk/web;
    wget -q https://raw.githubusercontent.com/Countly/countly-sdk-web/master/lib/countly.min.js -O $DIR/../../../frontend/express/public/sdk/web/countly.min.js
    wget -q https://raw.githubusercontent.com/Countly/countly-sdk-web/master/lib/countly.js -O $DIR/../../../frontend/express/public/sdk/web/countly.js
else
    usage ;
fi