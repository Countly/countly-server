#!/bin/bash

echo "Running filesystem modifications"

VER="22.02"

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
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
        rm /usr/local/bin/npm
        ln -s /usr/bin/npm /usr/local/bin/npm
    fi
    
    #upgrade files
    bash "$CUR/puppeteer.sh"

    #enable command line
    bash "$DIR/scripts/detect.init.sh"
    
    #removing files
    mv "$DIR/../frontend/express/public/javascripts/countly/countly.config.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.backup.20.11.js"
    cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"
    rm -f "$DIR/../frontend/express/public/robots.txt"
    
    
    (cd "$DIR/.." && sudo npm install --unsafe-perm && sudo npm install argon2 --build-from-source)
    
    #upgrade plugins
    countly plugin upgrade white-labeling
    countly plugin upgrade sources
    countly plugin upgrade two-factor-auth
    countly plugin upgrade web
    countly plugin upgrade push
    countly plugin upgrade hooks
    
    
    #enable new plugins
    countly plugin enable data-manager
    countly plugin enable heatmaps
    
    #disable old plugins
    countly plugin disable EChartMap
    countly plugin disable restrict
    countly plugin disable assistant
    
    #get web sdk
    countly update sdk-web

    #install dependencies, process files and restart countly
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