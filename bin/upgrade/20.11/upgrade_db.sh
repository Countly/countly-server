#!/bin/bash

VER="20.11"

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
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    #default setting for meta now
    countly config "drill.record_meta" "false"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        countly plugin upgrade star-rating
        countly plugin upgrade users
        countly plugin upgrade consolidate
        countly plugin upgrade two-factor-auth
        countly plugin upgrade web
        countly plugin upgrade active_directory
        countly plugin upgrade crash_symbolication
        countly plugin upgrade concurrent_users
        
        #enable new plugins
        countly plugin enable activity-map
        countly plugin enable config-transfer
        countly plugin enable consolidate
        countly plugin enable data-manager
        countly plugin enable hooks
        countly plugin enable surveys
    fi

    #run upgrade scripts
    nodejs "$CUR/scripts/removeUserProps.js"
    nodejs "$CUR/scripts/update_app_users.js"
    nodejs "$CUR/scripts/cleanup_concurrent.js"
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"
    
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