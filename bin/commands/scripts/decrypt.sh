#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly decrypt usage:";
    echo "    countly decrypt # decrypts text with configuration provided in api/config.js encryption object";
}

if [ -z "$1" ]
then
    read -rp "Text to decrypt: " text
else
    text=$1
fi

nodejs "$DIR/decrypt.js" "$text" ;