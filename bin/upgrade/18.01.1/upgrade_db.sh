#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade existing plugins
    countly plugin upgrade crashes
    countly plugin upgrade views
    countly plugin upgrade users
fi

#remove stuck push collections
nodejs "$DIR/upgrade/18.01.1/scripts/push_clear.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"