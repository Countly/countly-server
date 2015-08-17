#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat $DIR/countly.service ; echo "ExecStart=/usr/bin/supervisord --nodaemon --configuration $BINDIR/config/supervisord.conf") > /etc/systemd/system/countly.service