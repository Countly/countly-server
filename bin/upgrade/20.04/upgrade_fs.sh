#!/bin/bash

if [ -z "$NEW_COUNTLY" -o ! -f "$NEW_COUNTLY" ]
then
	echo "Run from upgrade.sh"
	exit
fi

echo "Running filesystem modifications"

VER="20.04"

CONTINUE="$($BASH "$NEW_COUNTLY" check before upgrade fs "$VER")"

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    #upgrade nodejs
    if [ -f /etc/redhat-release ]; then
        curl -sL https://rpm.nodesource.com/setup_10.x | $BASH -
        yum clean all
        yum remove -y nodejs
        yum install -y nodejs
    fi

    if [ -f /etc/lsb-release ]; then
        sudo dpkg --configure -a
        wget -qO- https://deb.nodesource.com/setup_10.x | $BASH -
        apt-get -f -y install
        apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
    fi

    #enable command line
    $BASH "$DIR/scripts/detect.init.sh"


    #remove predefined locale file, it should fallback to default one
    rm -rf "$DIR/../frontend/express/public/localization/min/locale_en.properties"

    #remove previous dependencies, as they need to be rebuild for new nodejs version
    rm -rf "$DIR/../node_modules"
    
    #remove previous package-lock.json
    rm -rf "$DIR/../package-lock.json"

    #run upgrade scripts
    $BASH "$CUR/scripts/remove_moved_files.sh"
    $BASH "$CUR/../19.08/scripts/remove_chrome_cache.sh"

    #upgrade plugins
    (cd "$DIR/.." && sudo npm install --unsafe-perm)
    GLIBC_VERSION=$(ldd --version | head -n 1 | rev | cut -d ' ' -f 1 | rev)
    if [[ "$GLIBC_VERSION" != "2.25" ]]; then
        (cd "$DIR/.." && sudo npm install argon2 --build-from-source)
    fi
    $BASH "$NEW_COUNTLY" plugin upgrade push
    (cd "$DIR/../plugins/push/api/parts/apn" && npm install --unsafe-perm)
    $BASH "$NEW_COUNTLY" plugin upgrade attribution
    $BASH "$NEW_COUNTLY" plugin upgrade web
    $BASH "$NEW_COUNTLY" plugin enable active_users
    $BASH "$NEW_COUNTLY" plugin enable performance-monitoring
    
    #get web sdk
    $BASH "$NEW_COUNTLY" update sdk-web

    #install dependencies, process files and restart countly
    $BASH "$NEW_COUNTLY" task dist-all

    #call after check
    $BASH "$NEW_COUNTLY" check after upgrade fs "$VER"
fi
