#!/bin/bash

echo "Running filesystem modifications"

VER="23.01"

CONTINUE="$(countly check before upgrade fs "$VER")"

if [ "$CONTINUE" != "1" ] && [ "$1" != "combined" ]
then
    echo "Filesystem is already up to date with $VER"
    read -r -p "Are you sure you want to run this script? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    then
        CONTINUE=1
    fi
fi

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

    #enable command line
    bash "$DIR/scripts/detect.init.sh"
    
    #upgrade plugins
    nodejs "$DIR/scripts/install_plugins.js"
    
    #get web sdk
    countly update sdk-web

    #install dependencies, process files and restart countly
    countly plugin enable license;
    if [ "$1" != "combined" ]; then
        countly upgrade;
    else
        countly task dist-all;
    fi

    #call after check
    countly check after upgrade fs "$VER"
elif [ "$CONTINUE" == "0" ]
then
    echo "Filesystem is already upgraded to $VER"
elif [ "$CONTINUE" == "-1" ]
then
    echo "Filesystem is upgraded to higher version"
else
    echo "Unknown ugprade state: $CONTINUE"
fi
