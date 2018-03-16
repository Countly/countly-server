#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
	curl -sL https://rpm.nodesource.com/setup_8.x | bash -
	yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
	wget -qO- https://deb.nodesource.com/setup_8.x | bash -
	apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
fi

#enable command line
bash $DIR/scripts/detect.init.sh

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf $DIR/../node_modules
countly upgrade

#upgrade plugins
countly plugin upgrade push

countly update sdk-web

#add indexes
nodejs $DIR/scripts/add_indexes.js

#install dependencies, process files and restart countly
countly upgrade