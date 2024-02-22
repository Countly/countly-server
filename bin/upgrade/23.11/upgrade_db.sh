#!/bin/bash

VER="23.11"

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
        countly plugin enable guides;
        nodejs "$DIR/scripts/install_plugins.js"
    fi
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"

    #run upgrade scripts
    nodejs "$SCRIPTS/scripts/check_app_images.js"
    nodejs "$SCRIPTS/scripts/remove_deleted_recors_from_widgets.js"
    nodejs "$SCRIPTS/scripts/update_timestamps_in_consent_history.js"


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
    echo "Unknown ugprade state: $CONTINUE"
fi
