#!/bin/bash

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

if [[ "$UBUNTU_YEAR" != "20" && "$UBUNTU_YEAR" != "22" ]]; then
    echo "Unsupported OS version, only support Ubuntu 20 and 22."
    exit 1
fi

bash "$DIR/scripts/logo.sh";

#update package index
sudo apt-get update

sudo apt-get install -y wget build-essential libkrb5-dev git sqlite3 unzip bzip2 shellcheck curl gnupg2 ca-certificates lsb-release

if [[ "$UBUNTU_YEAR" = "22" ]]; then
    sudo apt-get install -y python2 python2-dev

    if [[ ! -h /usr/bin/python ]]; then
        sudo ln -s /usr/bin/python2.7 /usr/bin/python
        sudo ln -s /usr/bin/python2-config /usr/bin/python-config
    fi
else
    sudo apt-get install -y python
fi

#Install GCC && G++> 7 version
sudo apt-get install -y software-properties-common
sudo apt-get install -y gcc g++ make

#Install dependancies required by the puppeteer
sudo apt-get install -y libgbm-dev libgbm1 gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

if sudo apt-cache pkgnames | grep -q python-software-properties; then
    sudo apt-get install -y python-software-properties
else
    sudo apt-get install -y python3-software-properties
fi

if ! (command -v apt-add-repository >/dev/null) then
    sudo apt-get install -y software-properties-common
fi

#install nginx
echo "deb http://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list
curl -fsSL https://nginx.org/keys/nginx_signing.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y nginx

#install node.js
#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs || (echo "Failed to install nodejs." ; exit)

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	sudo ln -s "$(which node)" /usr/bin/nodejs
elif [ ! -f "/usr/bin/node" ]; then
    sudo ln -s "$(which nodejs)" /usr/bin/node
fi

#if npm is not installed, install it too
if ! (command -v npm >/dev/null) then
    sudo apt-get install -y npm
fi

#install supervisor
if [ "$INSIDE_DOCKER" != "1" ]; then
    sudo apt-get install -y supervisor || (echo "Failed to install supervisor." ; exit)
    cp "$DIR/config/supervisord.example.conf" "$DIR/config/supervisord.conf"
fi

#install numactl
sudo apt-get install -y numactl

#install sendmail
sudo apt-get install -y sendmail

#install npm modules
npm config set prefix "$DIR/../.local/"
( cd "$DIR/.."; npm install -g npm@6.14.13; npm install sqlite3 --build-from-source; npm install; npm install argon2 --build-from-source; )

#install mongodb
sudo bash "$DIR/scripts/mongodb.install.sh"

if [ "$INSIDE_DOCKER" == "1" ]; then
    sudo bash "$DIR/commands/docker/mongodb.sh" &

    until mongosh --eval "db.stats()" | grep "collections"; do
        echo
        echo "waiting for MongoDB to allocate files..."
        sleep 1
    done

    sleep 3
fi

sudo bash "$DIR/scripts/detect.init.sh"

#configure and start nginx
#configure and start nginx
if [ -f /etc/nginx/sites-available/default ]; then
    countly save /etc/nginx/sites-available/default "$DIR/config/nginx"
elif [ -f /etc/nginx/conf.d/default.conf ]; then
    countly save /etc/nginx/conf.d/default.conf "$DIR/config/nginx"
fi

countly save /etc/nginx/nginx.conf "$DIR/config/nginx"
sudo cp "$DIR/config/nginx.server.conf" /etc/nginx/conf.d/default.conf
sudo cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf

if [ "$INSIDE_DOCKER" != "1" ]; then
    sudo /etc/init.d/nginx restart
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
    echo "Etc/UTC" | sudo tee -a /etc/timezone >/dev/null
fi

#install plugins
bash "$DIR/scripts/countly.install.plugins.sh"

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"

#get web sdk
sudo countly update sdk-web

#compile scripts for production
#sudo countly task dist-all

# after install call
sudo countly check after install

#finally start countly api and dashboard
if [ "$INSIDE_DOCKER" != "1" ]; then
    sudo countly start
fi

if [ "$INSIDE_DOCKER" == "1" ]; then
    sudo kill -2 "$(pgrep mongo)"
fi

bash "$DIR/scripts/done.sh";