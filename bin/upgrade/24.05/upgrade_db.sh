#!/bin/bash

VER="24.05"

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
    SCRIPTS="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
        nodejs "$DIR/scripts/install_plugins.js"
    fi
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"

    #run upgrade scripts
    nodejs "$SCRIPTS/scripts/scripts/ab_test_cohort_period_fix.js"
    nodejs "$SCRIPTS/scripts/generate_crashgroup_app_version_list.js"
    nodejs "$SCRIPTS/scripts/merge_consent_histories.js"
    nodejs "$SCRIPTS/scripts/merge_flow_collections.js"
    nodejs "$SCRIPTS/scripts/merge_times_of_day_collections.js"
    nodejs "$SCRIPTS/scripts/migrate_alerts_data.js"
    nodejs "$SCRIPTS/scripts/remove_old_consent_histories.js"
    nodejs "$SCRIPTS/scripts/remove_old_times_of_day_collections.js"
    nodejs "$SCRIPTS/scripts/update_populator_templates.js"
    nodejs "$SCRIPTS/scripts/push_indexes.js"


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
