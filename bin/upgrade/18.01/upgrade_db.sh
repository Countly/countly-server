#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade existing plugins
    countly plugin upgrade push
    countly plugin upgrade live

    countly plugin enable times-of-day
fi

nodejs "$DIR/upgrade/18.01/scripts/removeUnusedData.js"
    
set -e
nodejs "$DIR/upgrade/18.01/scripts/process_users_meta.js"
set +e


#add indexes
nodejs "$DIR/scripts/add_indexes.js"