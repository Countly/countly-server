#!/bin/bash

#   use this to get latest stable release
#       wget -qO- https://raw.githubusercontent.com/Countly/countly-server/master/bin/installer.sh | bash
#
#   use this to get latest development version from repo
#       wget -qO- https://raw.githubusercontent.com/Countly/countly-server/master/bin/installer.sh | bash -s dev

apt-get -v &> /dev/null && apt-get install -y zip </dev/null || yum install -y unzip;
if [ "$1" = "dev" ]; then
    wget -nv https://github.com/Countly/countly-server/archive/master.zip -O ./countly.zip ;
    unzip countly.zip ;
    mv countly-server-master countly
else
    LATEST=$(wget -qO- https://api.github.com/repos/countly/countly-server/releases/latest | grep browser_download_url | head -n 1 | cut -d '"' -f 4) ;

    if ping -c 1 google.com >> /dev/null 2>&1; then
        echo "Downloading from Github..."
        if [[ "$LATEST" == *zip ]]
        then
            wget -nv $LATEST -O ./countly.zip ;
            unzip countly.zip
        else
            wget -nv $LATEST -O ./countly.tar.gz ;
            tar zxfv countly.tar.gz ;
        fi
    else
        echo "Downloading from CDN..."
        PACKAGE_NAME=$(awk -F/ '{print $9}' <<< $LATEST)
        CDN_HOST=http://om65qc2mm.bkt.clouddn.com/
        if [[ "$LATEST" == *zip ]]
        then
            wget -nv $CDN_HOST$PACKAGE_NAME -O ./countly.zip ;
            unzip countly.zip
        else
            wget -nv $CDN_HOST$PACKAGE_NAME -O ./countly.tar.gz ;
            tar zxfv countly.tar.gz ;
        fi
    fi
fi

YUM_CMD=$(which yum)
APT_GET_CMD=$(which apt-get)
DATE=`date +%Y-%m-%d:%H:%M:%S`
if [[ ! -z $APT_GET_CMD ]]; then
    bash countly/bin/countly.install.sh 2>&1 | tee countly/log/countly-install-$DATE.log
elif [[ ! -z $YUM_CMD ]]; then
    bash countly/bin/countly.install_rhel.sh 2>&1 | tee countly/log/countly-install-$DATE.log
else
    echo "error can't install Countly"
    exit 1;
fi