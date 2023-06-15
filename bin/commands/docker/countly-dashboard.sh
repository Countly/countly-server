#!/usr/bin/env bash

if [ "$COUNTLY_MONGO_INSIDE" == "1" ]
then
	until mongosh localhost --eval "db.stats()" | grep "collections"
	do
	    echo
	    echo "[dashboard] waiting for MongoDB to allocate files ..."
	    sleep 1
	done
	sleep 3
	echo "[dashboard] MongoDB started"
fi

exec /sbin/setuser countly /usr/bin/nodejs /opt/countly/frontend/express/app.js
