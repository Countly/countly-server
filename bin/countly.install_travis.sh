#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash $DIR/scripts/logo.sh;

#make swap file
#bash $DIR/scripts/make.swap.sh

apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927

#update package index
apt-get update

apt-get -y install python-software-properties build-essential git sqlite3 unzip

if !(command -v apt-add-repository >/dev/null) then
    apt-get -y install software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_8.x | bash -

#update g++ to 4.8
add-apt-repository ppa:ubuntu-toolchain-r/test -y

#update once more after adding new repos
apt-get update

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
apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)

#install sendmail
#apt-get -y install sendmail

#install grunt & npm modules
npm --version
( npm install -g grunt-cli --unsafe-perm ; sudo npm install --unsafe-perm )

#install mongodb
#bash $DIR/scripts/mongodb.install.sh

#configure and start nginx
cp /etc/nginx/sites-enabled/default $DIR/config/nginx.default.backup
cp $DIR/config/nginx.server.conf /etc/nginx/sites-enabled/default
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
/etc/init.d/nginx restart

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

bash $DIR/scripts/detect.init.sh

#create api configuration file from sample
cp $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

if [ ! -f $DIR/../plugins/plugins.json ]; then
	cp $DIR/../plugins/plugins.default.json $DIR/../plugins/plugins.json
fi

#add all plugins to test
(
cd $DIR/../plugins
plugins="[";
for d in */ ; do
    plugins="$plugins\"${d::-1}\","
done
plugins="${plugins::-1}]"
echo "Adding all plugins"
echo $plugins
echo $plugins > plugins.json

)

#install nghttp2
bash $DIR/scripts/install.nghttp2.sh

#install plugins
bash $DIR/scripts/countly.install.plugins.sh

#compile scripts for production
cd $DIR && grunt dist-all

#finally start countly api and dashboard
countly start
