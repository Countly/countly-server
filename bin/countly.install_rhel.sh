#!/bin/bash
set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash $DIR/scripts/logo.sh;

#install nginx
yum -y install wget openssl-devel gcc-c++-4.8.5 make git sqlite unzip bzip2

if grep -q -i "release 6" /etc/redhat-release ; then
	echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/6/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo
    bash $DIR/scripts/install-google-chrome.sh;
elif grep -q -i "release 7" /etc/redhat-release ; then
	echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/7/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo
    yum -y install pango.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXtst.x86_64 cups-libs.x86_64 libXScrnSaver.x86_64 libXrandr.x86_64 GConf2.x86_64 alsa-lib.x86_64 atk.x86_64 gtk3.x86_64 ipa-gothic-fonts xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-utils xorg-x11-fonts-cyrillic xorg-x11-fonts-Type1 xorg-x11-fonts-misc
else
    echo "Unsupported OS version, only support RHEL/Centos 7 and 6" 
    exit 1
fi

#install nodejs
curl -sL https://rpm.nodesource.com/setup_8.x | bash -
yum install -y nodejs

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z $NODE_JS_CMD ]]; then
	ln -s `which node` /usr/bin/nodejs
fi

#install nginx
yum -y install policycoreutils-python
yum -y install nginx

set +e
useradd www-data
unalias cp
set -e

#install supervisor
yum -y install python-setuptools
yum install -y epel-release

yum install -y python-pip
if grep -q -i "release 6" /etc/redhat-release ; then
    pip install --upgrade pip==9.0.3
else
    pip install pip --upgrade
fi
yum install -y python-meld3
pip install supervisor

#install sendmail
yum -y install sendmail
service sendmail start

#install new gcc
if grep -q -i "release 6" /etc/redhat-release ; then
    echo "updating gcc to devtoolset-2..."
    sudo rpm --import http://ftp.riken.jp/Linux/cern/centos/7.1/os/x86_64/RPM-GPG-KEY-cern
    yum install -y wget 
    wget -O /etc/yum.repos.d/slc6-devtoolset.repo http://linuxsoft.cern.ch/cern/devtoolset/slc6-devtoolset.repo
    yum install -y devtoolset-2-gcc devtoolset-2-gcc-c++ devtoolset-2-binutils
    source /opt/rh/devtoolset-2/enable
    export CC=`which gcc` CXX=`which g++`
fi

#install grunt & npm modules
( cd $DIR/.. ; sudo npm install -g grunt-cli --unsafe-perm ; sudo npm install --unsafe-perm )

#install mongodb
bash $DIR/scripts/mongodb.install.sh

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

sed -e "s/Defaults requiretty/#Defaults requiretty/" /etc/sudoers > /etc/sudoers2
mv /etc/sudoers /etc/sudoers.bak
mv /etc/sudoers2 /etc/sudoers
chmod 0440 /etc/sudoers

bash $DIR/scripts/detect.init.sh

#configure and start nginx
set +e
countly save /etc/nginx/conf.d/default.conf $DIR/config/nginx
countly save /etc/nginx/nginx.conf $DIR/config/nginx
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
service nginx restart
systemctl enable nginx
set -e

#create configuration files from samples
if [ ! -f $DIR/../api/config.js ]; then
	cp $DIR/../api/config.sample.js $DIR/../api/config.js
fi

if [ ! -f $DIR/../frontend/express/config.js ]; then
	cp $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js
fi

if [ ! -f $DIR/../plugins/plugins.json ]; then
	cp $DIR/../plugins/plugins.default.json $DIR/../plugins/plugins.json
fi

#install nghttp2
bash $DIR/scripts/install.nghttp2.sh

#install plugins
node $DIR/scripts/install_plugins

#get web sdk
countly update sdk-web

# close google services for China area
if ping -c 1 google.com >> /dev/null 2>&1; then
    echo "Pinging Google successful. Enabling Google services."
    countly plugin disable EChartMap
else
    echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
    countly config "frontend.use_google" false
    countly plugin enable EChartMap
fi

#compile scripts for production
cd $DIR/.. && grunt dist-all

# disable transparent huge pages
#countly thp

#finally start countly api and dashboard
countly start

ENABLED=`getenforce`
if [ "$ENABLED" == "Enforcing" ]; then
  echo -e "\e[31mSELinux is enabled, please disable it or add nginx to exception for Countly to work properly\e[0m"
fi
