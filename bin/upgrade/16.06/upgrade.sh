#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [ -f /etc/redhat-release ]; then
	curl -sL https://rpm.nodesource.com/setup_5.x | bash -
	yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
	wget -qO- https://deb.nodesource.com/setup_5.x | bash -
	apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
fi

#enable command line
bash "$DIR/scripts/detect.init.sh"

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf "$DIR/../node_modules"

#install dependencies, process files and restart countly
countly upgrade

#install push dependencies
bash "$DIR/scripts/install.nghttp2.sh"

(cd "$DIR/.." ; npm install readable-stream)

#upgrade live plugin if it is installed
countly plugin upgrade push
countly plugin upgrade live
countly plugin upgrade reports

#for those who had drill bookmark api plugin, it is now in core
countly plugin disable drillbookmarks

countly update sdk-web
countly upgrade