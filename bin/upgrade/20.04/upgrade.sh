#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NEW_COUNTLY_DIR="$( cd "$DIR/../../.." && pwd )"
DATE=$(date +%Y-%m-%d:%H:%M:%S)
VERSION="$(basename "${DIR}")"

# Get the paths to the old and new installations
if [ $# -gt 0 -a -d "$1"/bin/commands ]
then
    OLD_COUNTLY_DIR="$1"
    OLD_COUNTLY="$(OLD_COUNTLY_DIR)/bin/commands/countly.sh"
else
    OLD_COUNTLY="$(which countly)"
    if [ -z "$OLD_COUNTLY" ]
    then
        echo "The countly command-line tool isn't available, you'll need to specify where the previous countly installation was"
        exit 1
    fi
    while [ -L "$OLD_COUNTLY" ]
    do
        OLD_COUNTLY="$(readlink ${OLD_COUNTLY})"
    done
    # Now that we have the executable file used for the countly command line, find the old installation directory
    OLD_COUNTLY_DIR="$(dirname ${OLD_COUNTLY})"
    while [ ! -d "$OLD_COUNTLY_DIR"/api -o ! -d "${OLD_COUNTLY_DIR}"/bin -o ! -d "${OLD_COUNTLY_DIR}"/extend -o ! -d "${OLD_COUNTLY_DIR}"/frontend -o ! -d "${OLD_COUNTLY_DIR}"/plugins ]
    do
        if [ "$OLD_COUNTLY_DIR" == "/" ]
        then
            # Can't find the old countly installation!
            echo "We can't find the previous installation, you'll need to specify where the previous countly installation was"
            exit 1
        fi
        OLD_COUNTLY_DIR="$( cd "$OLD_COUNTLY_DIR"/.. && pwd )"
    done
fi

countly stop
if [ -d "$DIR/.nodeenv" ]; then
    source "$DIR/.nodeenv/bin/activate"
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
fi
if [ -f "$DIR/upgrade_fs.sh" ]; then
    $BASH "$DIR/upgrade_fs.sh" combined 2>&1 | tee -a "$DIR/../../../log/countly-upgrade-fs-$VERSION-$DATE.log"
fi
if [ -f "$DIR/upgrade_db.sh" ]; then
    $BASH "$DIR/upgrade_db.sh" combined 2>&1 | tee -a "$DIR/../../../log/countly-upgrade-db-$VERSION-$DATE.log"
fi

# See if there are any user-added files that we should copy over to the new installation
if [ "$OLD_COUNTLY_DIR" != "$NEW_COUNTLY_DIR" ]
then
    rsync -av "${OLD_COUNTLY_DIR}/frontend/express/public/appimages/" "${NEW_COUNTLY_DIR}/frontend/express/public/appimages"
fi

countly start
