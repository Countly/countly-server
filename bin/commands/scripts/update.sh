#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly update usage:";
    echo "    countly update translations   # get latest translation files";
    echo "    countly update geoip          # get latest geoip-lite translation files";
    echo "";
} 
if [ "$1" = "translations" ]; then
    nodejs $DIR/update_translations.js ;
elif [ "$1" = "geoip" ]; then
    (cd $DIR/../../../node_modules/geoip-lite ; npm run-script updatedb ;)
else
    usage ;
fi