#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
usage (){
    echo "";
    echo "countly plugin usage:";
    echo "    countly plugin enable <pluginname>    # enables plugin";
    echo "    countly plugin disable <pluginname>   # disables plugin";
    echo "    countly plugin status pluginname      # status of plugin";
    echo "    countly plugin version pluginname     # version of plugin";
} 

if [ "$1" = "list" ]; then
    for d in $DIR/../../../plugins/*/; do
        if [ "$2" = "states" ]; then
            PLUGIN=$(basename $d) ;
            if grep -Fq "\"$PLUGIN\"" $DIR/../../../plugins/plugins.json
            then
                printf "  $PLUGIN =$GREEN enabled $NC\n";
            else
                printf "  $PLUGIN =$RED disabled $NC\n";
            fi
        else
            echo "  $(basename $d)";
        fi
    done
elif [ -d "$DIR/../../../plugins/$2" ]; then
    if [ "$1" = "enable" ]; then
        nodejs $DIR/plugin.js enable $2 ;
    elif [ "$1" = "disable" ]; then
        nodejs $DIR/plugin.js disable $2 ;
    elif [ "$1" = "upgrade" ]; then
        nodejs $DIR/plugin.js upgrade $2 ;
    elif [ "$1" = "status" ]; then
        if grep -Fq "\"$2\"" $DIR/../../../plugins/plugins.json
        then
            echo "enabled"
        else
            echo "disabled"
        fi
    elif [ "$1" = "version" ]; then
        echo "$(grep -oP '"version":\s*"\K[0-9\.]*' $DIR/../../../plugins/$2/package.json)" ;
    else
        usage ;
    fi
else
    echo "Plugin $2 does not exist";
fi