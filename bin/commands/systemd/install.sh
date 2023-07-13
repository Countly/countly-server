#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor service script
(cat "$DIR/countly.service" ; echo "ExecStart=/usr/bin/supervisord --nodaemon --configuration $BINDIR/config/supervisord.conf") > /etc/systemd/system/countly.service

if [ -n "$(command -v apt-get)" ]; then
    if [ ! -f /etc/systemd/system/mongod.service ]; then
        #create mongodb service script
        (cat "$DIR/mongod.service" ;
            echo "ExecStart=/usr/bin/mongod --quiet --config /etc/mongod.conf") > /etc/systemd/system/mongod.service

        #reload services
        systemctl daemon-reload
        systemctl enable mongod.service
        systemctl start mongod
    fi
fi

#reload services
systemctl daemon-reload

#enable services on boot
systemctl enable countly.service