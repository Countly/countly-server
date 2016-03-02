#!/bin/bash

#use it as
#wget -qO- https://github.com/Countly/countly-server/blob/master/bin/installer.sh | bash

LATEST=$(wget -qO- https://api.github.com/repos/countly/countly-server/releases/latest | grep browser_download_url | head -n 1 | cut -d '"' -f 4) ;
wget -nv $LATEST -O ./countly.zip ;
apt-get install -y zip </dev/null ;
unzip countly.zip ;
bash countly/bin/countly.install.sh ;