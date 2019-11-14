#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#add indexes
nodejs "$DIR/upgrade/17.05/removeOld.js"

if [ "$1" != "combined" ]; then
    #upgrade all plugins
    bash "$DIR/scripts/countly.install.plugins.sh"
    
    #enable new plugins
    countly plugin enable dashboards
    countly plugin enable assistant
    countly plugin enable flows
fi

#add indexes
nodejs "$DIR/scripts/add_indexes.js"
