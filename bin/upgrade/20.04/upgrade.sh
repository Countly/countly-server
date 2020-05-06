#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COUNTLY_DIR="$( cd "$DIR/../../.." && pwd )"
DATE=$(date +%Y-%m-%d:%H:%M:%S)
VERSION="$(basename "${DIR}")"
export BASH="/bin/bash"

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
if [ -z "$COUNTLY_CONTAINER" ]
then
	if [[ $(/sbin/init --version) =~ upstart ]];
	then
		NEW_COUNTLY="$COUNTLY_DIR/bin/commands/upstart/countly.sh"
	elif [ -x /sbin/launchd -a -x /bin/launchctl ];
	then
		NEW_COUNTLY="$COUNTLY_DIR/bin/commands/launchd/countly.sh"
	fi 2> /dev/null
else
	NEW_COUNTLY="$COUNTLY_DIR/bin/commands/docker/countly.sh"
fi
NEW_COUNTLY_LINK="$COUNTLY_DIR/bin/commands/countly.sh"

"$OLD_COUNTLY" stop
export NEW_COUNTLY
if [ -f "$DIR/upgrade_fs.sh" ]; then
    $BASH "$DIR/upgrade_fs.sh" combined 2>&1 | tee -a "$DIR/../../../log/countly-upgrade-fs-$VERSION-$DATE.log"
fi
if [ -f "$DIR/upgrade_db.sh" ]; then
    $BASH "$DIR/upgrade_db.sh" combined 2>&1 | tee -a "$DIR/../../../log/countly-upgrade-db-$VERSION-$DATE.log"
fi
if [ ! -L /usr/local/countly-current -o "$(readlink /usr/local/countly-current)" != "$COUNTLY_DIR" ]
then
	# launchd files are hardcoded to point to /usr/local/countly-current so create a link there to us.
	COUNTLY_DIR="$( cd "$DIR"/../.. && pwd )"
	sudo rm -f /usr/local/countly-current
	sudo ln -s "$COUNTLY_DIR" /usr/local/countly-current
fi

# See if there are any user-added files that we should copy over to the new installation
if [ "$OLD_COUNTLY" != "$NEW_COUNTLY_LINK" ]
then
	rsync -av "${OLD_COUNTLY_DIR}/frontend/express/public/appimages/" "${COUNTLY_DIR}/frontend/express/public/appimages"
fi

$BASH "$NEW_COUNTLY" start
