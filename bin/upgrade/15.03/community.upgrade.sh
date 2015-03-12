#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#install iptables
DEBIAN_FRONTEND=noninteractive apt-get -y install iptables-persistent

#drop packages coming from 0/0 going through mongodb port
#allow those coming from localhost
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s localhost -j ACCEPT
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s 0/0 -j DROP

#install iptables-persistent
apt-get install iptables-persistent

#install api modules
( cd $DIR/../../../api ; npm install --unsafe-perm )

#install frontend modules
( cd $DIR/../../../frontend/express ; npm install --unsafe-perm )

cp $DIR/../../../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../../../frontend/express/public/javascripts/countly/countly.config.js

#create api configuration file from sample
cp $DIR/../../../api/config.sample.js $DIR/../../../api/config.js

#create app configuration file from sample
cp $DIR/../../../frontend/express/config.sample.js $DIR/../../../frontend/express/config.js

#compile scripts for production
apt-get -y install default-jre
bash $DIR/../../scripts/compile.js.sh

( stop countly-supervisor ; 
cd $DIR ; 
node rename_event_collections.js ;
mongo sessions.js ; 
mongo events.js ; 
mongo cleanup.js ; 
mongo add_uid_app_users.js ;
start countly-supervisor
)

#install plugins
bash $DIR/../../scripts/countly.install.plugins.sh