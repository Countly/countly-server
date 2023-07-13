#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly config usage:";
    echo "    countly config <config.name>          # show config value";
    echo "    countly config <config.name> <value>  # change config value";
    echo "    countly config list                   # show available configurations";
    echo "    countly config list values            # show available configurations and values";
} 
if [ -z "$1" ] && [ -z "$2" ]
then
    usage ;
else
    nodejs "$DIR/config.js" "$@" ;
fi