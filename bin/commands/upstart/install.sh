#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat $DIR/countly-supervisor.conf ; echo "exec /usr/bin/supervisord --nodaemon --configuration $BINDIR/config/supervisord.conf") > /etc/init/countly-supervisor.conf

echo "countly ALL=(ALL) NOPASSWD: /sbin/start countly-supervisor, /sbin/stop countly-supervisor, /sbin/restart countly-supervisor, /sbin/status countly-supervisor" > /etc/sudoers.d/countly