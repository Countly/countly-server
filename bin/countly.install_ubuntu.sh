#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash $DIR/scripts/logo.sh;

#update package index
apt-get update

apt-get -y install python-software-properties wget build-essential libkrb5-dev git sqlite3 unzip

if !(command -v apt-add-repository >/dev/null) then
    apt-get -y install software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_8.x | bash -

#update once more after adding new repos
apt-get update

#always install 4.8 version
apt-get -y install gcc-4.8 g++-4.8

export CXX="g++-4.8"
export CC="gcc-4.8"
update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 90
g++ --version

#install nginx
apt-get -y install nginx || (echo "Failed to install nginx." ; exit)

#install node.js
#bash $DIR/scripts/install.nodejs.deb.sh || (echo "Failed to install nodejs." ; exit)
apt-get -y install nodejs || (echo "Failed to install nodejs." ; exit)

#install supervisor
if [ "$INSIDE_DOCKER" != "1" ]
then
	apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)
fi

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
if [ "$INSIDE_DOCKER" != "1" ]
then
	/etc/init.d/nginx restart
fi

cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

bash $DIR/scripts/detect.init.sh

#create api configuration file from sample
cp -n $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp -n $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

if [ ! -f $DIR/../plugins/plugins.json ]; then
	cp $DIR/../plugins/plugins.default.json $DIR/../plugins/plugins.json
fi

#install nghttp2
bash $DIR/scripts/install.nghttp2.sh

#install plugins
bash $DIR/scripts/countly.install.plugins.sh


#get web sdk
countly update sdk-web

#compile scripts for production
cd $DIR && grunt dist-all

#finally start countly api and dashboard
if [ "$INSIDE_DOCKER" != "1" ]
then
	countly start

	# close google services for China area
    if ping -c 1 google.com >> /dev/null 2>&1; then
        echo "Pinging Google successful. Enabling Google services."
    else
        echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
        countly config "frontend.use_google" false
    fi
fi
