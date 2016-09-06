#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly encrypt usage:";
    echo "    countly encrypt text # encrypts text with configuration provided in api/config.js encryption object";
} 
if [ -z "$1" ]
then
    usage ;
else
    nodejs $DIR/encrypt.js $1 ;
fi