#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#rename config property
WARN="$(countly config "logs.warning")"
countly config "logs.warning" null
countly config "logs.warn" "$WARN"

if [ "$1" != "combined" ]; then
    #upgrade existing plugins
    countly plugin upgrade push
    
    #enable new plugins
    countly plugin enable alerts
    countly plugin enable cohorts
    countly plugin enable crash_symbolication
    countly plugin enable groups
    countly plugin enable plugin-upload
    countly plugin enable white-labeling
fi

#add indexes
nodejs "$DIR/scripts/add_indexes.js"

