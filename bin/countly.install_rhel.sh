#!/bin/bash

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

echo "
   ______                  __  __         ______      __                       _
  / ____/___  __  ______  / /_/ /_  __   / ____/___  / /____  _________  _____(_)_______
 / /   / __ \/ / / / __ \/ __/ / / / /  / __/ / __ \/ __/ _ \/ ___/ __ \/ ___/ / ___/ _ \\
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /  / /___/ / / / /_/  __/ /  / /_/ / /  / (__  )  __/
\____/\____/\__,_/_/ /_/\__/_/\__, /  /_____/_/ /_/\__/\___/_/  / .___/_/  /_/____/\___/
              http://count.ly/____/                            /_/

"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#install nodejs
sudo yum -y install openssl-devel gcc-c++ make
cd /usr/local/src
wget http://nodejs.org/dist/node-latest.tar.gz
tar zxvf node-latest.tar.gz
cd node-v*
./configure
make
make install

cd $DIR

#install mongodb
echo "[10gen]
name=10gen Repository
baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64
gpgcheck=0
enabled=1" > /etc/yum.repos.d/10gen.repo

sudo yum -y install mongodb-org
sudo service mongod start

#install nginx
echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/6/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo

sudo yum -y install nginx

#for easy_install
sudo yum -y install python-setuptools

#install supervisor
sudo easy_install supervisor

#install imagemagick
sudo yum -y install ImageMagick

#install sendmail
sudo yum -y install sendmail
sudo service sendmail start

#install time module for node
( cd $DIR/../api ; /usr/local/bin/npm install time )

#configure and start nginx
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
/etc/init.d/nginx start

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

#create supervisor upstart script
(cat $DIR/config/countly-supervisor.conf ; echo "exec /usr/bin/supervisord --nodaemon --configuration $DIR/config/supervisord.conf") > /etc/init/countly-supervisor.conf

#create api configuration file from sample
cp $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

#finally start countly api and dashboard
start countly-supervisor