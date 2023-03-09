#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

echo "
   ______                  __  __
  / ____/___  __  ______  / /_/ /_  __
 / /   / __ \/ / / / __ \/ __/ / / / /
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /
\____/\____/\__,_/_/ /_/\__/_/\__, /
              http://count.ly/____/
"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#add mongodb repo
echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" > /etc/apt/sources.list.d/mongodb-10gen-countly.list
apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10

#update once more after adding new repos
apt-get update

#install mongodb
apt-get -y --force-yes install mongodb-org || (echo "Failed to install mongodb." ; exit)

#install iptables
DEBIAN_FRONTEND=noninteractive apt-get install -y  iptables-persistent

apt-get install -y  build-essential || (echo "Failed to install build-essential." ; exit)

#drop packages coming from 0/0 going through mongodb port
#allow those coming from localhost
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s localhost -j ACCEPT
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s 0/0 -j DROP

#install iptables-persistent
apt-get install -y  iptables-persistent

#install npm modules
( cd "$DIR/../../.." ; npm install )

#configure and start nginx
cp /etc/nginx/sites-enabled/default "$DIR/../../config/nginx.default.backup"
cp "$DIR/../../config/nginx.server.conf" /etc/nginx/sites-enabled/default
cp "$DIR/../../config/nginx.conf" /etc/nginx/nginx.conf
/etc/init.d/nginx restart

cp -f "$DIR/../../../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../../../frontend/express/public/javascripts/countly/countly.config.js"

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat "$DIR/../../config/countly-supervisor.conf" ; echo "exec /usr/bin/supervisord --nodaemon --configuration $DIR/../../config/supervisord.conf") > /etc/init/countly-supervisor.conf

#respawning mongod on crash
echo "respawn" >> /etc/init/mongod.conf

stop countly-supervisor

#create api configuration file from sample
cp -f "$DIR/../../../api/config.sample.js" "$DIR/../../../api/config.js"

#create app configuration file from sample
cp -f "$DIR/../../../frontend/express/config.sample.js" "$DIR/../../../frontend/express/config.js"

if [ ! -f "$DIR/../../../plugins/plugins.json" ]; then
	cp "$DIR/../../../plugins/plugins.default.json" "$DIR/../../../plugins/plugins.json"
fi

#compile scripts for production
countly task dist-all

#install plugins
bash "$DIR/../../scripts/countly.install.plugins.sh"

#finally start countly api and dashboard
start countly-supervisor