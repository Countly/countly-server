#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

countly stop

#upgrade existing plugins
countly plugin upgrade push

#upgrade drill meta if needed
if [ "$(countly plugin status drill)" != "Plugin drill does not exist" ] 
then
    #upgrade drill meta
    echo "Backing up drill meta before converting to new format"
    
    set -e
    bash $DIR/upgrade/17.12/scripts/backup_drill_meta.sh
    set +e
    
    echo "Finished backing up drill meta data to $DIR/upgrade/17.12/scripts/drill_backups"
    echo "If you need to restore it, run:"
    echo "bash $DIR/upgrade/17.12/scripts/restore_drill_meta.sh"
    
    nodejs $DIR/upgrade/17.12/scripts/process_drill_meta.js
    
    echo "Deleting old drill meta data"
    nodejs $DIR/upgrade/17.12/scripts/delete_drill_meta.js
    
    nodejs $DIR/upgrade/17.12/scripts/removeUnusedData.js
    
    set -e
    nodejs $DIR/upgrade/17.12/scripts/process_users_meta.js
    set +e
fi

#update web-sdk
countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade

countly start