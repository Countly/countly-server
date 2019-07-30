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

apt-get -y install wget build-essential libkrb5-dev git sqlite3 unzip bzip2

#Install dependancies required by the puppeteer
apt-get -y install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

if apt-cache pkgnames | grep -q python-software-properties; then
    apt-get -y install python-software-properties
else
    apt-get -y install python3-software-properties
fi

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

#if npm is not installed, install it too
if !(command -v npm >/dev/null) then
    apt-get -y install npm
fi

#install supervisor
if [ "$INSIDE_DOCKER" != "1" ]
then
	apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)
fi

#install sendmail
apt-get -y install sendmail

#install grunt & npm modules
( cd $DIR/.. ; sudo npm install -g grunt-cli --unsafe-perm ; sudo npm install --unsafe-perm)

#install mongodb
if [ "$INSIDE_DOCKER_NOMONGO" != "1" ]
then
    bash $DIR/scripts/mongodb.install.sh
fi

bash $DIR/scripts/detect.init.sh

#configure and start nginx
countly save /etc/nginx/sites-available/default $DIR/config/nginx
countly save /etc/nginx/nginx.conf $DIR/config/nginx
cp $DIR/config/nginx.server.conf /etc/nginx/sites-enabled/default
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf

if [ "$INSIDE_DOCKER" != "1" ]
then
	/etc/init.d/nginx restart
fi

cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

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

if [ "$INSIDE_DOCKER" != "1" ]; then
    # close google services for China area
    if ping -c 1 google.com >> /dev/null 2>&1; then
        echo "Pinging Google successful. Enabling Google services."
        countly plugin disable EChartMap
    else
        echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
        countly config "frontend.use_google" false
        countly plugin enable EChartMap
    fi
fi

#compile scripts for production
cd $DIR && grunt dist-all

#finally start countly api and dashboard
if [ "$INSIDE_DOCKER" != "1" ]
then
	countly start
fi
