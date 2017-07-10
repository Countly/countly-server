#!/usr/bin/env bash

until mongo localhost/countly --eval "db.stats()" | grep "collections"
do
    echo
    echo "[dashboard] waiting for MongoDB to allocate files ..."
    sleep 1
done
sleep 3
echo "[dashboard] MongoDB started"

exec /sbin/setuser countly /usr/bin/nodejs /opt/countly/frontend/express/app.js
