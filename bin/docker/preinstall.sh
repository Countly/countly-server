#!/usr/bin/env bash

source /etc/os-release

while IFS= read -r -d '' plugin
do
    echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install --unsafe-perm)
	echo "done"
done <   <(find /opt/countly/plugins -mindepth 1 -maxdepth 1 -type d -print0)

export CXX="" && export CC=""
