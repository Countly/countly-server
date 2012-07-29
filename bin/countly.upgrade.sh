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

#create api configuration file from sample
cp $DIR/../api/config.sample.js $DIR/../api/config.js

#add platform prefix to all platform versions stored in device_details collection
mongo countly $DIR/platform.versions.fix.js

#modify escaped single quotes
mongo countly $DIR/escape.fix.js

#start countly
start countly-supervisor