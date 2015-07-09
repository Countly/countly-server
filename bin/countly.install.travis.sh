#!/bin/bash

set -e

echo "
   ______                  __  __
  / ____/___  __  ______  / /_/ /_  __
 / /   / __ \/ / / / __ \/ __/ / / / /
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /
\____/\____/\__,_/_/ /_/\__/_/\__, /
              http://count.ly/____/
"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#make swap file
bash $DIR/scripts/make.swap.sh

#install grunt & npm modules
( cd $DIR/.. ; npm install -g grunt-cli --unsafe-perm ; npm install )

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

#respawning mongod on crash
echo "respawn" >> /etc/init/mongod.conf

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

#install plugins
bash $DIR/scripts/countly.install.plugins.sh

#compile scripts for production
cd $DIR && grunt dist-all

#finally start countly api and dashboard
start countly-supervisor