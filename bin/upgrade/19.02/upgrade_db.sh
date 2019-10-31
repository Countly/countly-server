#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade plugins
    countly plugin upgrade retention_segments
    countly plugin upgrade alerts
    countly plugin upgrade push
    countly plugin upgrade assistant
    countly plugin upgrade attribution
    countly plugin upgrade crashes
    countly plugin upgrade flows
    countly plugin upgrade plugin-upload
    countly plugin upgrade views
    
    #enable new plugins
    countly plugin enable remote-config
fi

countly config "views.view_limit" 50000

#run upgrade scripts
nodejs "$CUR/scripts/change_alerts_schedule.js"
nodejs "$CUR/scripts/clear_jobs.js"
nodejs "$CUR/scripts/drop_sessions.js"
nodejs "$CUR/scripts/fix_report_manager.js"
nodejs "$CUR/scripts/updateViews.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"