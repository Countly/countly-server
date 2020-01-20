#!/usr/bin/env bash

echo "Running filesystem modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"


#remove predefined locale file, it should fallback to default one
rm -rf "$DIR/../frontend/express/public/localization/min/locale_en.properties"

#run upgrade scripts
bash "$CUR/scripts/remove_moved_files.sh"

#upgrade plugins
(cd "$DIR/../" && npm install --unsafe-perm)
countly plugin upgrade push
(cd "$DIR/../plugins/push/api/parts/apn" && npm install --unsafe-perm)
countly plugin enable active_users

#install dependencies, process files and restart countly
countly upgrade
