#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

bash $DIR/scripts/detect.init.sh

#force mobile plugin for default mobile dashboard
countly plugin install mobile ;

#replace stores with sources
STORESTATE=$(countly plugin status stores);
if [ "$STORESTATE" == "installed" ] 
then
    countly plugin uninstall stores ;
    countly plugin install sources ;
fi

#update crashes dependencies
CRASHSTATE=$(countly plugin status crashes);
if [ "$CRASHSTATE" == "installed" ] 
then
    nodejs $DIR/../plugins/crashes/install.js
fi

#uninstall mognodb
apt-get remove -y mongodb-org
apt-get autoremove -y
rm /etc/apt/sources.list.d/mongodb-10gen-countly.list

#update repos
wget -qO- https://deb.nodesource.com/setup_4.x | bash -
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list
apt-get update

#install new nodejs dependencies
apt-get install -y build-essential libkrb5-dev

#install new node.js
apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)

#install new mongodb
apt-get -y --force-yes install mongodb-org || (echo "Failed to install mongodb." ; exit)

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf $DIR/../node_modules

#install dependencies, process files and restart countly
countly upgrade