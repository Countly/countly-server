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

#update package index
apt-get update

apt-get -y install python-software-properties

if !(command -v apt-add-repository >/dev/null) then
    apt-get -y install software-properties-common
fi

#add node.js repo
#echo | apt-add-repository ppa:chris-lea/node.js
wget -qO- https://deb.nodesource.com/setup | bash -

#add mongodb repo
echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" > /etc/apt/sources.list.d/mongodb-10gen-countly.list
apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10

#update once more after adding new repos
apt-get update

#install nginx
apt-get -y install nginx || (echo "Failed to install nginx." ; exit)

#install node.js
apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)

#install mongodb
apt-get -y --force-yes install mongodb-org || (echo "Failed to install mongodb." ; exit)

#install supervisor
apt-get -y install supervisor || (echo "Failed to install supervisor." ; exit)

#install imagemagick
apt-get -y install imagemagick

#install sendmail
#apt-get -y install sendmail

#install iptables
#DEBIAN_FRONTEND=noninteractive apt-get -y install iptables-persistent

apt-get -y install build-essential || (echo "Failed to install build-essential." ; exit)

#drop packages coming from 0/0 going through mongodb port
#allow those coming from localhost
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s localhost -j ACCEPT
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s 0/0 -j DROP

#install iptables-persistent
#apt-get install iptables-persistent

#install api modules
( cd $DIR/../api ; npm install --unsafe-perm )

#install frontend modules
( cd $DIR/../frontend/express ; npm install --unsafe-perm )

#configure and start nginx
cp /etc/nginx/sites-enabled/default $DIR/config/nginx.default.backup
cp $DIR/config/nginx.server.conf /etc/nginx/sites-enabled/default
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
/etc/init.d/nginx restart

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

#kill existing supervisor process
pkill -SIGTERM supervisord

#create supervisor upstart script
(cat $DIR/config/countly-supervisor.conf ; echo "exec /usr/bin/supervisord --nodaemon --configuration $DIR/config/supervisord.conf") > /etc/init/countly-supervisor.conf

#create api configuration file from sample
cp $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

#finally start countly api and dashboard
start countly-supervisor

#compile scripts for production
apt-get -y install default-jre
bash $DIR/scripts/compile.js.sh

#install plugins
bash $DIR/scripts/countly.install.plugins.sh