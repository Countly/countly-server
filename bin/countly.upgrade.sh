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

#drop packages coming from 0/0 going through mongodb port
#allow those coming from localhost
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s localhost -j ACCEPT
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s 0/0 -j DROP

#install iptables-persistent
apt-get install iptables-persistent

#DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
#mongo countly $DIR/updateCollections.js

#stop countly
stop countly-supervisor
#start countly
start countly-supervisor
