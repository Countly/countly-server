#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat $DIR/config/countly-supervisor.conf ; echo "exec /usr/bin/supervisord --nodaemon --configuration $DIR/config/supervisord.conf") > /etc/init/countly-supervisor.conf