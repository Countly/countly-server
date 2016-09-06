#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly decrypt usage:";
    echo "    countly decrypt text # decrypts text with configuration provided in api/config.js encryption object";
} 
if [ -z "$1" ]
then
    usage ;
else
    nodejs $DIR/decrypt.js $1 ;
fi