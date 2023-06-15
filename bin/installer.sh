#!/bin/bash

#   use this to get latest stable release
#       wget -qO- https://raw.githubusercontent.com/Countly/countly-server/master/bin/installer.sh | bash
#
#   use this to get latest development version from repo
#       wget -qO- https://raw.githubusercontent.com/Countly/countly-server/master/bin/installer.sh | bash -s dev

YUM_CMD=$(which yum)
APT_GET_CMD=$(which apt-get)
if [[ ! -z "$APT_GET_CMD" ]]; then
    apt-get install -y zip
elif [[ ! -z "$YUM_CMD" ]]; then
    yum install -y unzip wget
else
    echo "error can't install Countly"
    exit 1;
fi

if [ "$1" = "dev" ]; then
    wget -nv https://github.com/Countly/countly-server/archive/master.zip -O ./countly.zip ;
    unzip countly.zip ;
    mv countly-server-master countly
else
    LATEST=$(wget -qO- https://api.github.com/repos/countly/countly-server/releases/latest | grep tarball_url | head -n 1 | cut -d '"' -f 4)

    if [ -z "$LATEST" ]; then
        echo "Can't fetch download URL from Github."
        exit 1
    else
        if ping -c 1 google.com >> /dev/null 2>&1; then
            echo "Downloading from Github..."

            wget -nv "$LATEST" -O ./countly.tar.gz
            mkdir countly
            tar zxfv countly.tar.gz -C countly --strip-components 1
        else
            echo "Downloading from CDN..."
            PACKAGE_NAME=$(awk -F/ '{print $9}' <<< "$LATEST")
            CDN_HOST=http://countly-1252600587.cos.ap-guangzhou.myqcloud.com/

            wget -nv "$CDN_HOST$PACKAGE_NAME" -O ./countly.tar.gz
            mkdir countly
            tar zxfv countly.tar.gz -C countly --strip-components 1
        fi
    fi
fi

bash countly/bin/countly.install.sh