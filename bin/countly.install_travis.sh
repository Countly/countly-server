#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$DIR/scripts/logo.sh";

#make swap file
#bash $DIR/scripts/make.swap.sh

apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927

#update package index
apt-get update

apt-get install -y  build-essential git sqlite3 unzip shellcheck

if apt-cache pkgnames | grep -q python-software-properties; then
    apt-get install -y  python-software-properties
else
    apt-get install -y  python3-software-properties
fi

if ! (command -v apt-add-repository >/dev/null) then
    apt-get install -y  software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_14.x | bash -

#update g++ to 4.8
add-apt-repository ppa:ubuntu-toolchain-r/test -y

#update once more after adding new repos
apt-get update

apt-get install -y  gcc-4.8 g++-4.8

export CXX="g++-4.8"
export CC="gcc-4.8"
update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 90
g++ --version

#install nginx
apt-get install -y  nginx || (echo "Failed to install nginx." ; exit)

#install node.js
apt-get install -y  nodejs || (echo "Failed to install nodejs." ; exit)

#install supervisor
apt-get install -y  supervisor || (echo "Failed to install supervisor." ; exit)

#install sendmail
#apt-get install -y  sendmail

#install npm modules
node --version
npm --version
( sudo npm install --unsafe-perm )

GLIBC_VERSION=$(ldd --version | head -n 1 | rev | cut -d ' ' -f 1 | rev)
if [[ "$GLIBC_VERSION" != "2.25" ]]; then
    sudo npm install argon2 --build-from-source
fi

#install mongodb
#bash $DIR/scripts/mongodb.install.sh

#configure and start nginx
cp /etc/nginx/sites-enabled/default "$DIR/config/nginx.default.backup"
cp "$DIR/config/nginx.server.conf" /etc/nginx/sites-enabled/default
cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf
/etc/init.d/nginx restart

cp "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

bash "$DIR/scripts/detect.init.sh"

#create api configuration file from sample
cp "$DIR/../api/config.sample.js" "$DIR/../api/config.js"

#create app configuration file from sample
cp "$DIR/../frontend/express/config.sample.js" "$DIR/../frontend/express/config.js"

if [ ! -f "$DIR/../plugins/plugins.json" ]; then
	cp "$DIR/../plugins/plugins.default.json" "$DIR/../plugins/plugins.json"
fi

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" > /etc/timezone
fi

#add all plugins to test
(
cd "$DIR/../plugins"
plugins="[";
for d in */ ; do
    plugins="$plugins\"${d::-1}\","
done
plugins="${plugins::-1}]"
echo "Adding all plugins"
echo "$plugins"
echo "$plugins" > plugins.json

)

#install plugins
bash "$DIR/scripts/countly.install.plugins.sh"

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"

#compile scripts for production
countly task dist-all

# after install call
countly check after install

#finally start countly api and dashboard
countly start
