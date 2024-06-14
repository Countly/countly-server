#!/bin/bash

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#Configure supervisor
cp "$DIR/config/supervisord.example.conf" "$DIR/config/supervisord.conf"

sudo apt-get update

#install npm modules
npm config set prefix "$DIR/../.local/"
( cd "$DIR/.."; npm install argon2; npm install sqlite3 --build-from-source; npm install; )

#install mongodb
if ! command -v mongod &> /dev/null; then
    echo "mongod not found, installing MongoDB"
    sudo bash "$DIR/scripts/mongodb.install.sh"
else
    echo "MongoDB is already installed"
    # check for ipv6 compatibility and restart mongo service
    sudo bash "$DIR/scripts/mongodb.install.sh" configure
    sudo systemctl restart mongod
    sudo systemctl status mongod
fi

sudo bash "$DIR/scripts/detect.init.sh"

#configure and start nginx
if [ -f /etc/nginx/sites-available/default ]; then
    countly save /etc/nginx/sites-available/default "$DIR/config/nginx"
elif [ -f /etc/nginx/conf.d/default.conf ]; then
    countly save /etc/nginx/conf.d/default.conf "$DIR/config/nginx"
fi

countly save /etc/nginx/nginx.conf "$DIR/config/nginx"
sudo cp "$DIR/config/nginx.server.conf" /etc/nginx/conf.d/default.conf
sudo cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf

sudo /etc/init.d/nginx restart

cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

#create api configuration file from sample
cp -n "$DIR/../api/config.sample.js" "$DIR/../api/config.js"

#create app configuration file from sample
cp -n "$DIR/../frontend/express/config.sample.js" "$DIR/../frontend/express/config.js"

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" | sudo tee -a /etc/timezone >/dev/null
fi

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"

#get web sdk
sudo countly update sdk-web

#finally start countly api and dashboard
sudo countly start