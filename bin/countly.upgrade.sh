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

#DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
#mongo countly $DIR/updateCollections.js

#stop countly
stop countly-supervisor
#start countly
start countly-supervisor
