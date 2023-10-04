#!/bin/bash

# this script creates a default user and an app for countly.
# default values are as following
#
#   Full Name: Countly Admin
#   Email: admin@countly.com
#   username: admin
#   password: admin
#   api_key: e6bfab40a224d55a2f5d40c83abc7ed4
#   app_name: default
#   app_owner":"58bf0614a68a980015486d03"
#   app_key":"b41e02136be60a58b9b7459ad89030537a58e099"


#  make relative paths work.
cd "$(dirname "$0")"

function check_connectivity_mongosh() {
    local MONGO_OK;

	if ! MONGO_OK=$(mongosh --quiet --eval "db.serverStatus().ok == true") || [[ "$MONGO_OK" != true ]]; then
		echo "error: mongodb service check failed"
		return 1
	fi

	return 0
}

# generic check connectivity function
function check_connectivity() {
	retries=600
	until eval "check_connectivity_$*"; do
		sleep 1
		(( retries-- ))
		if [ $retries == 0 ]; then
			echo "time out while waiting for $* is ready"
			exit 1
		fi
		echo "$* is not reachable yet, trying again..."
	done
	echo "$* is up and running..."
}

# wait till mongo becomes online.
check_connectivity mongosh

#
#  Backup is taken with the following commands
#
# /usr/bin/mongoexport --db countly  --collection  app_crashgroups58bf06bd6cba850047ac9f19  --out app_crashgroups58bf06bd6cba850047ac9f19.json
# /usr/bin/mongoexport --db countly  --collection  apps                                     --out apps.json
# /usr/bin/mongoexport --db countly  --collection  members                                  --out members.json

/usr/bin/mongoimport --db countly --collection app_crashgroups58bf06bd6cba850047ac9f19 --file app_crashgroups58bf06bd6cba850047ac9f19.json --upsert
/usr/bin/mongoimport --db countly --collection apps --file apps.json --upsert
/usr/bin/mongoimport --db countly --collection members --file members.json --upsert
/usr/bin/mongoimport --db countly --collection events --file events.json --upsert
/usr/bin/mongoimport --db countly_drill --collection drill_meta --file drill_meta.json --upsert
