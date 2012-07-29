#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly upgrade script with a superuser..." 1>&2
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

#install sendmail
apt-get -y install sendmail

#stop countly
stop countly-supervisor

#add machine IP as API IP for countly dashboard
serverip="`ifconfig | sed -n 's/.*inet addr:\([0-9.]\+\)\s.*/\1/p' | grep -v 127.0.0.1`"
echo "countlyCommon.READ_API_URL = \"http://$serverip/o\"" > $DIR/../frontend/express/public/javascripts/countly/countly.config.js

#delete existing user from members collection
mongo countly --eval "db.members.remove()"

#start countly
start countly-supervisor

echo -e "\nVisit http://$serverip in order to setup your administrator account\n"