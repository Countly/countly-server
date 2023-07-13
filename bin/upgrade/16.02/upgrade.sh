#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#apt-get install -y gawk;

## each separate version number must be less than 3 digit wide !
#function version { echo "$@" | gawk -F. '{ printf("%03d%03d%03d\n", $1,$2,$3); }'; }

#enable command line
bash "$DIR/scripts/detect.init.sh"

#uninstall mognodb
#apt-get remove -y mongodb-org mongodb-org-mongos mongodb-org-server mongodb-org-shell mongodb-org-tools
#rm /etc/apt/sources.list.d/mongodb-10gen-countly.list

#update repos
#wget -qO- https://deb.nodesource.com/setup_5.x | bash -
#sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
#echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list

#gcc_need=4.8.0
#gcc_have=$(gcc --version | grep ^gcc | sed 's/^.* //g')
#if [ "$(version "$gcc_have")" -lt "$(version "$gcc_need")" ]; then
#    add-apt-repository ppa:ubuntu-toolchain-r/test -y ;
#fi

#apt-get update

#if [ "$(version "$gcc_have")" -lt "$(version "$gcc_need")" ]; then
#    apt-get install -y gcc-4.8 g++-4.8 ;
#    export CXX="g++-4.8" ;
#    export CC="gcc-4.8" ;
#    update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 90 ;
#fi

#install new nodejs dependencies
#apt-get install -y build-essential libkrb5-dev

#stop countly
#countly stop

#install new mongodb
#apt-get -y --force-yes install mongodb-org || (echo "Failed to install mongodb." ; exit)

#remove previous dependencies, as they need to be rebuild for new nodejs version
#rm -rf $DIR/../node_modules

#install dependencies, process files and restart countly
countly upgrade

#force mobile plugin for default mobile dashboard
countly plugin enable mobile ;

#replace stores with sources
STORESTATE=$(countly plugin status stores);
if [ "$STORESTATE" == "enabled" ]
then
    countly plugin disable stores ;
    countly plugin enable sources ;
fi

#upgrade push plugin if it is installed
countly plugin upgrade push

countly update sdk-web
countly start
countly upgrade