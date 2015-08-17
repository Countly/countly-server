#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"

function countly() {
    if [ "$1" = "start" ]; then
        start countly-supervisor;
    elif [ "$1" = "stop" ]; then
        stop countly-supervisor;
    elif [ "$1" = "restart" ]; then
        restart countly-supervisor;
    elif [ "$1" = "upgrade" ]; then
        (cd $DIR ;
        npm install ;
        grunt dist-all;
        restart countly-supervisor;
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