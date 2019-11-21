#!/usr/bin/env bash

if [ "$COUNTLY_MONGO_INSIDE" == "1" ]
then
	until mongo localhost --eval "db.stats()" | grep "collections"
	do
	    echo
	    echo "[api] waiting for MongoDB to allocate files ..."
	    sleep 1
	done
	sleep 3
	echo "[api] MongoDB started"
fi

exec /sbin/setuser countly /usr/bin/nodejs /opt/countly/api/api.js
