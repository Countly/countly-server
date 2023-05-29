#!/bin/bash

echo "Running filesystem modifications"

VER="23.05"

CONTINUE="$(countly check before upgrade fs "$VER")"

if [ "$CONTINUE" != "1" ] && [ "$1" != "combined" ]
then
    echo "Filesystem is already up to date with $VER"
    read -r -p "Are you sure you want to run this script? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    then
        CONTINUE=1
    fi
fi

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

    #enable command line
    bash "$DIR/scripts/detect.init.sh"
    
    #upgrade plugins
    nodejs "$DIR/scripts/install_plugins.js"
    
    #get web sdk
    countly update sdk-web
    
    #use localhost instead of IPv4 local IP address to be IPv6 friendly
    find /etc/nginx/ -type f -exec sed -i 's#http://127.0.0.1#http://localhost#g' {} +
    nginx -t
    nginx -s reload
    
    if [ "$1" != "combined" ]; then
        countly upgrade;
    else
        countly task dist-all;
    fi

    #call after check
    countly check after upgrade fs "$VER"
elif [ "$CONTINUE" == "0" ]
then
    echo "Filesystem is already upgraded to $VER"
elif [ "$CONTINUE" == "-1" ]
then
    echo "Filesystem is upgraded to higher version"
else
    echo "Unknown ugprade state: $CONTINUE"
fi
