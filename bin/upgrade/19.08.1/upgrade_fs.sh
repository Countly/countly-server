#!/bin/bash

echo "Running filesystem modifications"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash "$DIR/scripts/detect.init.sh"

#update plugins
countly plugin upgrade crashes
countly plugin upgrade push
(cd "$DIR/../plugins/push/api/parts/apn" && sudo npm install --unsafe-perm)

#udpate packages
(cd "$DIR" && sudo npm update --unsafe-perm)

#update sdk
countly update sdk-web

#install dependencies, process files and restart countly
countly upgrade