#!/bin/bash

echo "Running database modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade plugins
    countly plugin upgrade crashes
    countly plugin upgrade push
    countly plugin upgrade systemlogs
    countly plugin disable live
    countly plugin enable concurrent_users
    countly plugin enable formulas
    countly plugin enable ab-testing
    #replace totp with two-factor-aut
    STATE=$(countly plugin status  totp);
    if [ "$STATE" == "enabled" ] 
    then
        countly plugin disable  totp ;
        countly plugin enable two-factor-auth ;
    fi
fi

#run upgrade scripts
nodejs "$CUR/scripts/live_concurrent.js"
nodejs "$CUR/scripts/notes_upgrade.js"
nodejs "$CUR/scripts/update_crashes.js"
nodejs "$CUR/scripts/migrate_totp.js"
nodejs "$CUR/scripts/push.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"