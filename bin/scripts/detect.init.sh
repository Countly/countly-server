#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# use available init system
INITSYS="systemd"

if [ -z "$COUNTLY_CONTAINER" ]; then
	if [[ $(/sbin/init --version) =~ upstart ]]; then
	    INITSYS="upstart"
	fi 2> /dev/null
else
	INITSYS="docker"
fi

bash "$DIR/commands/$INITSYS/install.sh"
ln -sf "$DIR/commands/$INITSYS/countly.sh" "$DIR/commands/enabled/countly.sh"

chmod +x "$DIR/commands/countly.sh"
ln -sf "$DIR/commands/countly.sh" /usr/bin/countly

cp -f "$DIR/commands/scripts/autocomplete/countly" /etc/bash_completion.d