#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

COUNTLY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
DIR=$COUNTLY_DIR/bin

bash $DIR/scripts/logo.sh;

#update package index
apt-get update

apt-get -y install python-software-properties wget g++

if !(command -v apt-add-repository >/dev/null) then
    apt-get -y install software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_6.x | bash -

#update once more after adding new repos
apt-get update

#install nginx
apt-get -y install nginx || (echo "Failed to install nginx." ; exit)

#install node.js
#bash $DIR/scripts/install.nodejs.deb.sh || (echo "Failed to install nodejs." ; exit)
apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)

#install supervisor
apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)

#install sendmail
apt-get -y install sendmail

#install grunt & npm modules
( cd $DIR/.. ; npm install -g grunt-cli --unsafe-perm ; npm install )

#install mongodb
bash $DIR/scripts/mongodb.install.sh

#configure and start nginx
cp /etc/nginx/sites-enabled/default $DIR/config/nginx.default.backup
cp $DIR/config/nginx.server.conf /etc/nginx/sites-enabled/default
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
/etc/init.d/nginx restart

cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

bash $DIR/scripts/detect.init.sh

#create api configuration file from sample
cp -n $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp -n $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

if [ ! -f $DIR/../plugins/plugins.json ]; then
	cp $DIR/../plugins/plugins.default.json $DIR/../plugins/plugins.json
fi

#install plugins
bash $DIR/scripts/countly.install.plugins.sh

#get web sdk
countly update sdk-web

#compile scripts for production
cd $DIR && grunt dist-all

if [ `getent passwd countly`x == 'x' ]; then
  useradd -r -M -U -d $COUNTLY_DIR -s /bin/false countly
  chown -R countly:countly $COUNTLY_DIR
fi

echo "countly ALL=(ALL) NOPASSWD: /usr/bin/countly start, /usr/bin/countly stop, /usr/bin/countly restart, /usr/bin/countly upgrade" >> /etc/sudoers.d/countly

#finally start countly api and dashboard
countly start