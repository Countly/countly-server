#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"

function countly() {
    if [ "$1" = "start" ]; then
        launchctl start com.countly.api;
        launchctl start com.countly.dashboard;
    elif [ "$1" = "stop" ]; then
        launchctl stop com.countly.api;
        launchctl stop com.countly.dashboard;
    elif [ "$1" = "restart" ]; then
        countly start;
        countly stop;
    elif [ "$1" = "upgrade" ]; then
        (cd $DIR ;
        npm install ;
        grunt dist-all;
        countly restart;
        )
    else
        echo "";
        echo "usage:";
        echo "    countly start   # starts countly process";
        echo "    countly stop    # stops countly process";
        echo "    countly restart # restarts countly process";
        echo "    countly upgrade # standard upgrade process (install dependencies, minify files, restart countly)";
        echo "";
    fi
    
    return 0;
}