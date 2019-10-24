#!/bin/bash

while IFS= read -r -d '' plugin
do
    echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install)
	echo "done"
done <   <(find /opt/countly/plugins -type d -mindepth 1 -maxdepth 1)