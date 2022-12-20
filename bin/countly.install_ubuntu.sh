#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

if [[ "$UBUNTU_YEAR" != "18" && "$UBUNTU_YEAR" != "20" ]]; then
    echo "Unsupported OS version, only support Ubuntu 20 and 18"
    exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$DIR/scripts/logo.sh";

#update package index
apt-get update

apt-get -y install wget build-essential libkrb5-dev git sqlite3 unzip bzip2 shellcheck python

#Install GCC > 7 version
apt-get -y install software-properties-common
add-apt-repository ppa:ubuntu-toolchain-r/test -y
apt-get -y install build-essential gcc-8 
update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 8
update-alternatives --set gcc "/usr/bin/gcc-8"

#Install G++ > 7 version
apt-get -y install build-essential g++-8
update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-8 8
update-alternatives --set g++ "/usr/bin/g++-8"

#Install dependancies required by the puppeteer
apt-get -y install libgbm-dev libgbm1 gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

if apt-cache pkgnames | grep -q python-software-properties; then
    apt-get -y install python-software-properties
else
    apt-get -y install python3-software-properties
fi

if ! (command -v apt-add-repository >/dev/null) then
    apt-get -y install software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_18.x | bash -

#update once more after adding new repos
apt-get update

#install nginx
apt-get -y install curl gnupg2 ca-certificates lsb-release
echo "deb http://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" \
    | tee /etc/apt/sources.list.d/nginx.list
curl -fsSL https://nginx.org/keys/nginx_signing.key | apt-key add -
apt-get update
apt-get -y install nginx

#install node.js
apt-get -y install nodejs || (echo "Failed to install nodejs." ; exit)

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	ln -s "$(which node)" /usr/bin/nodejs
fi

#if npm is not installed, install it too
if ! (command -v npm >/dev/null) then
    apt-get -y install npm
fi

#install supervisor
if [ "$INSIDE_DOCKER" != "1" ]
then
	apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)
fi

#install numactl
apt-get -y install numactl

#install sendmail
apt-get -y install sendmail

#install npm modules
( cd "$DIR/.."; sudo npm install -g npm@6.14.13; sudo npm install --unsafe-perm=true --allow-root; sudo npm install argon2 --build-from-source; )

#install mongodb
bash "$DIR/scripts/mongodb.install.sh"

if [ "$INSIDE_DOCKER" == "1" ]
then
	bash "$DIR/commands/docker/mongodb.sh" &
    until mongo --eval "db.stats()" | grep "collections"
    do
        echo
        echo "waiting for MongoDB to allocate files..."
        sleep 1
    done
    sleep 3
fi

bash "$DIR/scripts/detect.init.sh"

#configure and start nginx
countly save /etc/nginx/sites-available/default "$DIR/config/nginx"
countly save /etc/nginx/nginx.conf "$DIR/config/nginx"
cp "$DIR/config/nginx.server.conf" /etc/nginx/conf.d/default.conf
cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf

if [ "$INSIDE_DOCKER" != "1" ]
then
	/etc/init.d/nginx restart
fi

cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

#create api configuration file from sample
cp -n "$DIR/../api/config.sample.js" "$DIR/../api/config.js"

#create app configuration file from sample
cp -n "$DIR/../frontend/express/config.sample.js" "$DIR/../frontend/express/config.js"

if [ ! -f "$DIR/../plugins/plugins.json" ]; then
	cp "$DIR/../plugins/plugins.default.json" "$DIR/../plugins/plugins.json"
fi

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" > /etc/timezone
fi

#install plugins
bash "$DIR/scripts/countly.install.plugins.sh"

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"


#get web sdk
countly update sdk-web

if [ "$INSIDE_DOCKER" != "1" ]; then
    # close google services for China area
    if ping -c 1 google.com >> /dev/null 2>&1; then
        echo "Pinging Google successful. Enabling Google services."
    else
        echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
        countly config "frontend.use_google" false --force
    fi
fi

#compile scripts for production
countly task dist-all

# after install call
countly check after install

#finally start countly api and dashboard
if [ "$INSIDE_DOCKER" != "1" ]
then
	countly start
fi

bash "$DIR/scripts/done.sh";

if [ "$INSIDE_DOCKER" == "1" ]
then
	kill -2 "$(pgrep mongo)"
fi
