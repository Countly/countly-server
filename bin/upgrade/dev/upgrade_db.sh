#!/bin/bash

echo "Running database modifications"

VER="20.04.1"

CONTINUE="$(countly check before upgrade db "$VER")"

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    if [ "$1" != "combined" ]; then
        #upgrade plugins
    fi

    #run upgrade scripts
    nodejs "$CUR/scripts/messages_index.js"

    #call after check
    countly check after upgrade db "$VER"
fi