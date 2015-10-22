#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly update usage:";
    echo "    countly update translations     # get latest translation files";
    echo "";
} 
if [ "$1" = "translations" ]; then
    nodejs $DIR/update_translations.js ;
else
    usage ;
fi