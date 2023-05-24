#!/bin/bash

# shellcheck disable=SC1091
source /etc/os-release
plugins="[";
while IFS= read -r -d '' plugin
do
    echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install --unsafe-perm=true --allow-root)
	plugins="$plugins\"$(basename "${plugin}")\","
	echo "done"
done <   <(find /opt/countly/plugins -mindepth 1 -maxdepth 1 -type d -print0)

plugins="${plugins::-1}]"

node ./node_modules/geoip-lite/scripts/updatedb.js license_key="$GEOIP"

echo "$plugins" > /opt/countly/plugins/plugins.json

(cd /opt/countly && npx grunt dist-all && rm -rf /opt/countly/plugins/plugins.json)

export CXX="" && export CC=""
