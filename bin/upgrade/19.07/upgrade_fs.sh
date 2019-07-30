#!/bin/bash

echo "Running filesystem modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh


#remove predefined locale file, it should fallback to default one
rm -rf $DIR/../frontend/express/public/localization/min/locale_en.properties 

#run upgrade scripts
bash $CUR/scripts/remove_chrome_cache.sh
bash $CUR/scripts/remove_flash_corssorigin.sh

#upgrade plugins
countly upgrade
countly plugin upgrade crashes
countly plugin disable live
countly plugin enable concurrent_users
countly plugin enable formulas
countly plugin enable ab-testing

#install dependencies, process files and restart countly
countly upgrade