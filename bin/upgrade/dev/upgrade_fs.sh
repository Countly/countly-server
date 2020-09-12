#!/bin/bash

echo "Running filesystem modifications"

VER="20.04.2"

CONTINUE="$(countly check before upgrade fs "$VER")"

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    # CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    #enable command line
    bash "$DIR/scripts/detect.init.sh"


    countly plugin upgrade push
    (cd "$DIR/../plugins/push/api/parts/apn" && npm install --unsafe-perm)

    #install dependencies, process files and restart countly
    countly task dist-all

    #call after check
    countly check after upgrade fs "$VER"
fi
