#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# use available init system
INITSYS="systemd"

if [ "$INSIDE_DOCKER" = "1" ]
then
	INITSYS="docker" 
elif [[ `/sbin/init --version` =~ upstart ]];
then
    INITSYS="upstart"
fi 2> /dev/null

bash $DIR/commands/$INITSYS/install.sh
ln -sf $DIR/commands/$INITSYS/countly.sh $DIR/commands/enabled/countly.sh

chmod +x $DIR/commands/countly.sh
ln -sf $DIR/commands/countly.sh /usr/bin/countly