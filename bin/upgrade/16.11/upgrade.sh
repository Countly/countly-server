#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
	curl -sL https://rpm.nodesource.com/setup_6.x | bash -
	yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
	wget -qO- https://deb.nodesource.com/setup_6.x | bash -
	apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
fi

#enable command line
bash $DIR/scripts/detect.init.sh

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf $DIR/../node_modules

#upgrade graph colors for new UI
mv $DIR/../frontend/express/public/javascripts/countly/countly.config.js $DIR/../frontend/express/public/javascripts/countly/countly.config.backup.js
cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

pkill -f executor.js

#upgrade push plugin if it is installed
countly plugin upgrade push

countly update sdk-web

#install dependencies, process files and restart countly
countly upgrade