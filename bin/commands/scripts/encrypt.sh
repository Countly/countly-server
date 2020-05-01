#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly encrypt usage:";
    echo "    countly encrypt # encrypts text with configuration provided in api/config.js encryption object";
}

if [ -z "$1" ]
then
    read -rp "Text to encrypt: " text
else
    text=$1
fi

nodejs "$DIR/encrypt.js" "$text" ;