#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly mongo:";
    echo "    countly mongo <dbname> # outputs mongo cmd params to connect to specified countly db";
}
if [ -z "$1" ]
then
    nodejs "$DIR/db.conf.js" ;
else
    nodejs "$DIR/db.conf.js" "$1" ;
fi