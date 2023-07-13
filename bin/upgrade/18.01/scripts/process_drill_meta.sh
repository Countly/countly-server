#!/bin/bash

#upgrade drill meta if needed
if [ "$(countly plugin status drill)" != "Plugin drill does not exist" ] 
then
    #upgrade drill meta
    echo "Backing up drill meta before converting to new format"
    
    set -e
    bash "$DIR/upgrade/17.12/scripts/backup_drill_meta.sh"
    
    
    echo "Finished backing up drill meta data to $DIR/upgrade/17.12/scripts/drill_backups"
    echo "If you need to restore it, run:"
    echo "bash $DIR/upgrade/17.12/scripts/restore_drill_meta.sh"
    
    nodejs "$DIR/upgrade/17.12/scripts/process_drill_meta.js"
    set +e
    
    #echo "Deleting old drill meta data"
    #nodejs $DIR/upgrade/17.12/scripts/delete_drill_meta.js
fi