#!/usr/bin/env bash

until mongo localhost/countly --eval "db.stats()" | grep -q "collections"
do
    echo
    echo "[api] waiting for MongoDB to allocate files ..."
    sleep 1
done
sleep 3
echo "[api] MongoDB started"

exec /sbin/setuser countly /usr/bin/nodejs /opt/countly/api/api.js
