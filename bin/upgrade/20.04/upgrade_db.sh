#!/bin/bash

VER="20.04"

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

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        countly plugin enable active_users
        countly plugin enable performance-monitoring
    fi

    #run upgrade scripts
    nodejs "$CUR/scripts/upgradeReports.js"
    nodejs "$CUR/scripts/encrypt_2fa_secrets.js"
    nodejs "$CUR/scripts/set_additional_api_configs.js"
    nodejs "$CUR/scripts/clearOldTokens.js"
    nodejs "$CUR/scripts/remove_drill_index.js"
    nodejs "$CUR/../18.01/scripts/delete_drill_meta.js"
    nodejs "$CUR/scripts/fix_nxret.js"

    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"

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