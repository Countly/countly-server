#!/usr/bin/env bash

exec /sbin/setuser mongodb /usr/bin/mongod --config /etc/mongod.conf
/opt/countly/bin/backup/run.sh
