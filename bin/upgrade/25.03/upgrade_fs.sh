#!/bin/bash

echo "Running filesystem modifications"

VER="25.03"

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
    
    countly plugin enable content;
    countly plugin enable journey_engine;

    #upgrade plugins
    nodejs "$DIR/scripts/install_plugins.js"
    
    #get web sdk
    countly update sdk-web

    #isolated-vm (hooks custom code) needs node started with --no-node-snapshot on
    #Node.js 20 and later; installs from before 25.03.58 start it without
    SUPERVISORD_CONF="$DIR/config/supervisord.conf"
    if [ -f "$SUPERVISORD_CONF" ] && ! grep -q -- "--no-node-snapshot" "$SUPERVISORD_CONF"; then
        sed -i 's#^command=node #command=node --no-node-snapshot #' "$SUPERVISORD_CONF"
        echo "Added --no-node-snapshot to $SUPERVISORD_CONF; it applies when Countly restarts"
    fi
   
    
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
    echo "Unknown upgrade state: $CONTINUE"
fi
