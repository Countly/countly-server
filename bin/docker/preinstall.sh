#!/bin/bash

for plugin in `find /opt/countly/plugins -type d -mindepth 1 -maxdepth 1`
do
	echo "Installing $plugin..."
	(cd "$plugin" && HOME=/tmp npm install)
	echo "done"
done