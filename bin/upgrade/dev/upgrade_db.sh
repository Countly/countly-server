#!/bin/bash

echo "Running database modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" != "combined" ]; then
    #upgrade plugins
    countly plugin enable active_users
fi

#run upgrade scripts
nodejs "$CUR/scripts/upgradeReports.js"
nodejs "$CUR/scripts/encrypt_2fa_secrets.js"
nodejs "$CUR/scripts/set_additional_api_configs.js"
nodejs "$CUR/scripts/clearOldTokens.js"
nodejs "$CUR/scripts/remove_drill_index.js"
nodejs "$CUR../18.01/scripts/delete_drill_meta.js"

#add indexes
nodejs "$DIR/scripts/add_indexes.js"