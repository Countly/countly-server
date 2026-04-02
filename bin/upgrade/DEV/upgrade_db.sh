#!/bin/bash

VER="25.06"

CONTINUE="$(countly check before upgrade db "$VER")"

if [ "$CONTINUE" != "1" ] && [ "$1" != "combined" ]
then
    echo "Database is already up to date with $VER"
    read -r -p "Are you sure you want to run this script? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    then
        CONTINUE=1
    fi
fi

if [ "$CONTINUE" == "1" ]
then
    echo "Running database modifications"
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    SCRIPTS="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        countly plugin enable content;
        countly plugin enable journey_engine;        
        nodejs "$DIR/scripts/install_plugins.js"
    fi
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"

    #run upgrade scripts
    nodejs "$SCRIPTS/scripts/merge_events_collections.js"


    if [ "$1" != "combined" ]; then
        countly upgrade;
    fi

    #call after check
    countly check after upgrade db "$VER"
elif [ "$CONTINUE" == "0" ]
then
    echo "Database is already upgraded to $VER"
elif [ "$CONTINUE" == "-1" ]
then
    echo "Database is upgraded to higher version"
else
    echo "Unknown upgrade state: $CONTINUE"
fi
