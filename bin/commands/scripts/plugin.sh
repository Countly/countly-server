#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly plugin usage:";
    echo "    countly plugin install pluginname     # install plugin";
    echo "    countly plugin uninstall pluginname   # uninstall plugin";
    echo "    countly plugin status pluginname      # status of plugin";
    echo "    countly plugin version pluginname     # version of plugin";
} 
if [ -d "$DIR/../../../plugins/$2" ]; then
    if [ "$1" = "install" ]; then
        nodejs $DIR/plugin.js install $2 ;
    elif [ "$1" = "uninstall" ]; then
        nodejs $DIR/plugin.js uninstall $2 ;
    elif [ "$1" = "status" ]; then
        if grep -Fq "\"$2\"" $DIR/../../../plugins/plugins.json
        then
            echo "installed"
        else
            echo "not installed"
        fi
    elif [ "$1" = "version" ]; then
        echo "$(grep -oP '"version":\s*"\K[0-9\.]*' $DIR/../../../plugins/$2/package.json)" ;
    else
        usage ;
    fi
else
    echo "Plugin $2 does not exist";
fi