#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh


#remove predefined locale file, it should fallback to default one
rm -rf $DIR/../frontend/express/public/localization/min/locale_en.properties 

nodejs $CUR/scripts/update_crashes.js

#upgrade plugins
countly upgrade
countly plugin upgrade crashes

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade