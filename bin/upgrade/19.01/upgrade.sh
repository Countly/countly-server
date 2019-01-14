#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#upgrade config
mv $DIR/../frontend/express/public/javascripts/countly/countly.config.js $DIR/../frontend/express/public/javascripts/countly/countly.config.backup.19.01.js
cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

#remove predefined locale file, it should fallback to default one
rm -rf $DIR/../frontend/express/public/localization/min/locale_en.properties 

#remove outdated connect-mongoskin
rm -rf $DIR/../node_modules/connect-mongoskin/

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade
