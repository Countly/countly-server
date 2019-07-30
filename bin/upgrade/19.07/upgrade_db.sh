#!/bin/bash

echo "Running database modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ $1 != "combined" ]; then
    #upgrade plugins
    countly plugin upgrade crashes
    countly plugin disable live
    countly plugin enable concurrent_users
    countly plugin enable formulas
    countly plugin enable ab-testing
fi

#run upgrade scripts
nodejs $CUR/scripts/live_concurrent.js
nodejs $CUR/scripts/notes_upgrade.js
nodejs $CUR/scripts/update_crashes.js

#add indexes
nodejs $DIR/scripts/add_indexes.js