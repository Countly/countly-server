#!/bin/bash

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

#install nodejs
if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
    echo "updating gcc to devtoolset-2..."
    rpm --import http://ftp.scientificlinux.org/linux/scientific/5x/x86_64/RPM-GPG-KEYs/RPM-GPG-KEY-cern
    wget -O /etc/yum.repos.d/slc6-devtoolset.repo http://linuxsoft.cern.ch/cern/devtoolset/slc6-devtoolset.repo
    yum install -y devtoolset-2-gcc devtoolset-2-gcc-c++ openssl-devel make
    source /opt/rh/devtoolset-2/enable
else
	yum -y install openssl-devel gcc-c++ make
fi

curl -sL https://rpm.nodesource.com/setup_5.x | bash -
yum install -y nodejs
sudo ln -s `which node` /usr/bin/nodejs

#install mongodb
echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/3.2/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/mongodb-org-3.2.repo

sudo yum -y install mongodb-org
sudo service mongod start

#install nginx
sudo yum -y install policycoreutils-python
sudo yum -y install wget
echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/7/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo

sudo yum -y install nginx

#configure and start nginx
useradd www-data
unalias cp
cp /etc/nginx/conf.d/default.conf $DIR/config/nginx.default.backup
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
cp $DIR/config/nginx.conf /etc/nginx/nginx.conf
service nginx restart

wget http://127.0.0.1:3001/i

sudo cat /var/log/audit/audit.log | grep nginx | grep denied | audit2allow -M mynginx
sudo semodule -i mynginx.pp

#for easy_install
sudo yum -y install python-setuptools

#install supervisor
sudo easy_install supervisor

#install sendmail
sudo yum -y install sendmail
sudo service sendmail start

#install grunt
( cd $DIR/.. ; npm install -g grunt-cli --unsafe-perm ; npm install )

#install api modules
( cd $DIR/../api ; npm install --unsafe-perm )

#install frontend modules
( cd $DIR/../frontend/express ; npm install --unsafe-perm )

#configure and start nginx
cp $DIR/config/nginx.server.conf /etc/nginx/conf.d/default.conf
service nginx restart

cp $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

sed -e "s/Defaults requiretty/#Defaults requiretty/" /etc/sudoers > /etc/sudoers2
mv /etc/sudoers /etc/sudoers.bak
mv /etc/sudoers2 /etc/sudoers
chmod 0440 /etc/sudoers

bash $DIR/scripts/detect.init.sh

#create api configuration file from sample
cp -n $DIR/../api/config.sample.js $DIR/../api/config.js

#create app configuration file from sample
cp -n $DIR/../frontend/express/config.sample.js $DIR/../frontend/express/config.js

if [ ! -f $DIR/../plugins/plugins.json ]; then
	cp $DIR/../plugins/plugins.default.json $DIR/../plugins/plugins.json
fi

#install nghttp2
bash $DIR/scripts/install.nghttp2.sh

#install plugins
node $DIR/scripts/install_plugins

#get web sdk
countly update sdk-web

#compile scripts for production
cd $DIR && grunt dist-all

#finally start countly api and dashboard
countly start