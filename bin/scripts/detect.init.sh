#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# use available init system
INITSYS="systemd"

if [ "$1" = "docker" ]
then
	INITSYS="docker" 
elif [[ `/sbin/init --version` =~ upstart ]];
then
    INITSYS="upstart"
fi

bash $DIR/commands/$INITSYS/install.sh

chmod +x $DIR/commands/$INITSYS/countly.sh
ln -sf $DIR/commands/$INITSYS/countly.sh /usr/bin/countly