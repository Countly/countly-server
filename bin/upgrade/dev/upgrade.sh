#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#upgrade config
mv $DIR/../frontend/express/public/javascripts/countly/countly.config.js $DIR/../frontend/express/public/javascripts/countly/countly.config.backup.19.01.js
cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

#remove predefined locale file, it should fallback to default one
rm -rf $DIR/../frontend/express/public/localization/min/locale_en.properties 

#remove outdated connect-mongoskin
rm -rf $DIR/../node_modules/connect-mongoskin/

#upgrade plugins
countly upgrade
countly plugin upgrade retention_segments
countly plugin upgrade alerts
countly plugin upgrade push

nodejs $CUR/scripts/change_alerts_schedule.js
nodejs $CUR/scripts/clear_jobs.js
nodejs $CUR/scripts/fix_report_manager.js

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade