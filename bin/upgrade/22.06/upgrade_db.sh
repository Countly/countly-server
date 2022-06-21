#!/bin/bash

VER="22.06"

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
    
    #default setting for meta now
    countly config "drill.record_meta" "false"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        nodejs "$DIR/scripts/install_plugins.js"
        
        #enable new plugins
        countly plugin enable data-manager
        countly plugin enable heatmaps
        
        #disable old plugins
        countly plugin disable EChartMap
        countly plugin disable restrict
        countly plugin disable assistant
    fi

    #run upgrade scripts
    nodejs "$DIR/scripts/loadCitiesInDb.js"
    nodejs "$CUR/scripts/push_all_things.js"
    nodejs "$CUR/scripts/remove_old_flows_collections.js"
    nodejs "$CUR/scripts/reset_upgraded_custom_dashboards.js"
    
    #change config settings
    countly config "api.batch_on_master" null --force
    countly config "api.batch_read_on_master" null --force
    countly config "funnels.funnel_caching" true --force
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"
    
    if [ "$1" != "combined" ]; then
        countly upgrade;
    fi

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
