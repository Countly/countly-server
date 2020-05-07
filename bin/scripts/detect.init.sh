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
    fi 2> /dev/null
else
    INITSYS="docker" 
fi

bash "$DIR/commands/$INITSYS/install.sh"
ln -sf "$DIR/commands/$INITSYS/countly.sh" "$DIR/commands/enabled/countly.sh"

chmod +x "$DIR/commands/countly.sh"
if [ -x /sbin/launchd -a -x /bin/launchctl ];
then
    ln -sf "$DIR/commands/countly.sh" /usr/local/bin/countly
    if [ -d /usr/local/etc/bash_completion.d ]; then
	    cp -f "$DIR/commands/scripts/autocomplete/countly" /usr/local/etc/bash_completion.d
	fi
else
    ln -sf "$DIR/commands/countly.sh" /usr/bin/countly
    cp -f "$DIR/commands/scripts/autocomplete/countly" /etc/bash_completion.d
fi
