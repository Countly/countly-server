#!/bin/bash
set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

echo "
   ______                  __  __         ______      __                       _
  / ____/___  __  ______  / /_/ /_  __   / ____/___  / /____  _________  _____(_)_______
 / /   / __ \/ / / / __ \/ __/ / / / /  / __/ / __ \/ __/ _ \/ ___/ __ \/ ___/ / ___/ _ \\
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /  / /___/ / / / /_/  __/ /  / /_/ / /  / (__  )  __/
\____/\____/\__,_/_/ /_/\__/_/\__, /  /_____/_/ /_/\__/\___/_/  / .___/_/  /_/____/\___/
              http://count.ly/____/                            /_/

"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#install nodejs & mongodb
yum -y install wget openssl-devel gcc-c++ make
if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
	echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6/mongodb-org/3.2/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/mongodb-org-3.2.repo
	echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/6/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo
else
	echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/3.2/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/mongodb-org-3.2.repo
	echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/7/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo
fi

curl -sL https://rpm.nodesource.com/setup_6.x | bash -
yum install -y nodejs mongodb-org

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z $NODE_JS_CMD ]]; then
	ln -s `which node` /usr/bin/nodejs
fi
if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
    service mongod start
else
    systemctl restart mongod
fi

#install nginx
yum -y install policycoreutils-python
yum -y install nginx

#configure and start nginx
set +e
useradd www-data
unalias cp
cp /etc/nginx/conf.d/default.conf $DIR/config/nginx.default.backup
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
service nginx restart
set -e

#for easy_install
yum -y install python-setuptools

#install supervisor
easy_install supervisor

#install sendmail
yum -y install sendmail
service sendmail start

#install grunt
( cd $DIR/.. ; npm install -g grunt-cli --unsafe-perm )

#configure and start nginx
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
service nginx restart

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

sed -e "s/Defaults requiretty/#Defaults requiretty/" /etc/sudoers > /etc/sudoers2
mv /etc/sudoers /etc/sudoers.bak
mv /etc/sudoers2 /etc/sudoers
chmod 0440 /etc/sudoers

bash $DIR/scripts/detect.init.sh

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

if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
    echo "updating gcc to devtoolset-2..."
    rpm --import http://ftp.scientificlinux.org/linux/scientific/5x/x86_64/RPM-GPG-KEYs/RPM-GPG-KEY-cern
    yum install -y wget 
    wget -O /etc/yum.repos.d/slc6-devtoolset.repo http://linuxsoft.cern.ch/cern/devtoolset/slc6-devtoolset.repo
    yum install -y devtoolset-2-gcc devtoolset-2-gcc-c++ devtoolset-2-binutils
    source /opt/rh/devtoolset-2/enable

    # and then install dependencies for sharp
    curl -s https://raw.githubusercontent.com/lovell/sharp/master/preinstall.sh | bash -
    source /opt/rh/devtoolset-2/enable
    export CC=`which gcc` CXX=`which g++`
fi
cd $DIR/.. && npm install

#install nghttp2
bash $DIR/scripts/install.nghttp2.sh

#install plugins
node $DIR/scripts/install_plugins

#get web sdk
countly update sdk-web

#compile scripts for production
cd $DIR/.. && grunt dist-all

# disable transparent huge pages
countly thp

#finally start countly api and dashboard
countly start

ENABLED=`getenforce`
if [ "$ENABLED" == "Enforcing" ]; then
  echo -e "\e[31mSELinux is enabled, please disable it or add nginx to exception for Countly to work properly\e[0m"
fi