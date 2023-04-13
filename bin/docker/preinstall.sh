#!/bin/bash

# shellcheck disable=SC1091
source /etc/os-release

while IFS= read -r -d '' plugin
do
    echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install --unsafe-perm=true --allow-root)
	echo "done"
done <   <(find /opt/countly/plugins -mindepth 1 -maxdepth 1 -type d -print0)

node ./node_modules/geoip-lite/scripts/updatedb.js license_key="$GEOIP"

(cd /opt/countly && npx grunt dist-all)

export CXX="" && export CC=""
