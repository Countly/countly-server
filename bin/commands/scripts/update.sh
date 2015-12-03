#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly update usage:";
    echo "    countly update translations   # get latest translation files";
    echo "    countly update geoip          # get latest geoip-lite translation files";
} 
if [ "$1" = "translations" ]; then
    nodejs $DIR/update_translations.js ;
elif [ "$1" = "geoip" ]; then
    (cd $DIR/../../../node_modules/geoip-lite ; npm run-script updatedb ;)
elif [ "$1" = "devices" ]; then
    wget -q https://raw.githubusercontent.com/Countly/countly-localization/master/data/countly.device.list.js -O $DIR/../../../frontend/express/public/javascripts/countly/countly.device.list.js
else
    usage ;
fi