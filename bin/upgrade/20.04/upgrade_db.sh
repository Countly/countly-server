#!/bin/bash

if [ -z "$NEW_COUNTLY" -o ! -f "$NEW_COUNTLY" ]
then
	echo "Run from upgrade.sh"
	exit
fi

echo "Running database modifications"

VER="20.04"

CONTINUE="$($BASH "$NEW_COUNTLY" check before upgrade db "$VER")"

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        $BASH "$NEW_COUNTLY" plugin enable active_users
        $BASH "$NEW_COUNTLY" plugin enable performance-monitoring
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
    $BASH "$NEW_COUNTLY" check after upgrade db "$VER"
fi
