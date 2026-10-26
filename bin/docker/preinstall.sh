#!/bin/bash

# shellcheck disable=SC1091
source /etc/os-release
plugins="[";
while IFS= read -r -d '' plugin
do
    echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install --fetch-retries=5 --fetch-retry-maxtimeout=120000) || { echo "ERROR: npm install failed for $plugin"; failed_plugins="$failed_plugins $plugin"; }
	plugins="$plugins\"$(basename "${plugin}")\","
	echo "done"
done <   <(find /opt/countly/plugins -mindepth 1 -maxdepth 1 -type d -print0)

if [ -n "$failed_plugins" ]; then
	echo "ERROR: plugin installs failed:$failed_plugins"
	exit 1
fi

plugins="${plugins::-1}]"

node ./node_modules/geoip-lite/scripts/updatedb.js license_key="$GEOIP"

echo "$plugins" > /opt/countly/plugins/plugins.json

(cd /opt/countly && npx grunt dist-all && rm -rf /opt/countly/plugins/plugins.json) || { echo "ERROR: grunt dist-all failed"; exit 1; }

export CXX="" && export CC=""
