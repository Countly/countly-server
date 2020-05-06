#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# use available init system
INITSYS="systemd"

if [ -z "$COUNTLY_CONTAINER" ]
then
	if [[ $(/sbin/init --version) =~ upstart ]];
	then
	    INITSYS="upstart"
	elif [ -x /sbin/launchd -a -x /bin/launchctl ];
	then
		INITSYS="launchd"
		# launchd files are hardcoded to point to /usr/local/countly-current so create a link there to us.
		COUNTLY_DIR="$( cd "$DIR"/../.. && pwd )"
		sudo rm -f /usr/local/countly-current
		sudo ln -s "$COUNTLY_DIR" /usr/local/countly-current
	fi 2> /dev/null
else
	INITSYS="docker" 
fi

bash "$DIR/commands/$INITSYS/install.sh"
ln -sf "$DIR/commands/$INITSYS/countly.sh" "$DIR/commands/enabled/countly.sh"

chmod +x "$DIR/commands/countly.sh"
if [ -x /usr/bin/csrutil -a "$(/usr/bin/csrutil status | sed -E -e 's/^.+status: *(.+)$/\1/')" == "enabled." ]
then
	ln -sf "$DIR/commands/countly.sh" /usr/local/bin/countly
else
	ln -sf "$DIR/commands/countly.sh" /usr/bin/countly
fi

cp -f "$DIR/commands/scripts/autocomplete/countly" /etc/bash_completion.d