#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat "$DIR/countly-supervisor.conf" ; echo "exec /usr/bin/supervisord --nodaemon --configuration $BINDIR/config/supervisord.conf") > /etc/init/countly-supervisor.conf