#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade plugins
    countly plugin upgrade push
    countly plugin upgrade revenue
    countly plugin upgrade attribution
    countly plugin upgrade crashes
    countly plugin upgrade errorlogs
    countly plugin upgrade star-rating
    countly plugin upgrade logger
    countly plugin upgrade populator
    countly plugin upgrade funnels
    countly plugin upgrade data_migration
    countly plugin upgrade retention_segments
    countly plugin enable onboarding
fi

#run upgrade scripts
nodejs "$DIR/upgrade/18.08/scripts/tokens_fix_owner.js"
nodejs "$DIR/upgrade/18.01.1/scripts/push_clear.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"
