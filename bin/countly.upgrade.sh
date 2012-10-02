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

#stop countly
stop countly-supervisor

#update all mongo collections for 12.09
mongo countly $DIR/updateCollections.js

#start countly
start countly-supervisor

os="`lsb_release -ds`"
wget 'http://count.ly/t?a=247152a73e2b3934ab73c4477c5f85e1&cly_v=907348361b9fc62242b06465b925bb32&os_v='"$os" >/dev/null 2>&1