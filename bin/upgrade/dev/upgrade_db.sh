#!/usr/bin/env bash

echo "Running database modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade plugins
    countly plugin enable active_users
fi

#run upgrade scripts
nodejs "$CUR/scripts/upgradeReports.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"
