#!/bin/bash

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$DIR/scripts/logo.sh";

# prerequisite per release
sudo yum -y install wget openssl-devel make git sqlite unzip bzip2

sudo yum install -y python3-pip
sudo pip3 install pip --upgrade
sudo pip3 install meld3
sudo pip3 install supervisor --ignore-installed meld3
sudo yum -y install python3-setuptools

if grep -q -i "release 8" /etc/redhat-release ; then
    sudo yum -y install python3-policycoreutils
    sudo yum -y group install "Development Tools"

    if [ ! -f "/etc/centos-release" ]; then
        sudo dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
    fi

    sudo yum -y install epel-release
    # see https://github.com/koalaman/shellcheck/issues/1871
    wget https://github.com/koalaman/shellcheck/releases/download/v0.7.1/shellcheck-v0.7.1.linux.x86_64.tar.xz
    sudo tar -C /usr/local/bin/ -xf shellcheck-v0.7.1.linux.x86_64.tar.xz --no-anchored 'shellcheck' --strip=1

    sudo ln -sf /usr/local/bin/shellcheck /usr/bin/shellcheck

    if [ ! -x "$(command -v python)" ]; then
        sudo ln -sf /usr/bin/python3 /usr/bin/python
    fi

    #Install raven-release for ipa-gothic-fonts required by puppeteer
    sudo yum -y install https://pkgs.dyn.su/el8/base/x86_64/raven-release-1.0-3.el8.noarch.rpm
elif grep -q -i "release 7" /etc/redhat-release ; then
    sudo yum -y install policycoreutils-python
    #install nginx
    echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/7/x86_64/
gpgcheck=0
enabled=1" | sudo tee /etc/yum.repos.d/nginx.repo >/dev/null

    if [ -f "/etc/centos-release" ]; then
        sudo yum -y --enablerepo=extras install epel-release
        sudo yum install centos-release-scl -y
    fi

    sudo yum install devtoolset-8 -y
    sudo yum install devtoolset-8-gcc* -y
    #shellcheck source=/dev/null
    source /opt/rh/devtoolset-8/enable && echo -e "\nsource /opt/rh/devtoolset-8/enable" | sudo tee -a /etc/profile
    sudo yum install -y epel-release
    sudo yum install -y ShellCheck

else
    echo "Unsupported OS version, only support RHEL/Centos 8 and 7"
    exit 1
fi

sudo ln -sf /usr/local/bin/echo_supervisord_conf /usr/bin/echo_supervisord_conf
sudo ln -sf /usr/local/bin/pidproxy /usr/bin/pidproxy
sudo ln -sf /usr/local/bin/supervisorctl /usr/bin/supervisorctl
sudo ln -sf /usr/local/bin/supervisord /usr/bin/supervisord
cp "$DIR/config/supervisord.example.conf" "$DIR/config/supervisord.conf"

#Install dependancies required by the puppeteer
sudo yum -y install alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 GConf2.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils ipa-gothic-fonts
#Install nss after installing above dependencies
sudo yum update nss -y

#install nodejs
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	sudo ln -s "$(which node)" /usr/bin/nodejs
elif [ ! -f "/usr/bin/node" ]; then
    sudo ln -s "$(which nodejs)" /usr/bin/node
fi

#install nginx
sudo yum -y install nginx

set +e
sudo useradd www-data
unalias cp
set -e

if grep -q -i "release 8" /etc/redhat-release ; then
    sudo chown -R www-data:www-data /var/lib/nginx
fi

#install sendmail
sudo yum -y install sendmail
sudo systemctl start sendmail > /dev/null || echo "sendmail service does not exist"

#install npm modules
npm config set prefix "$DIR/../.local/"
( cd "$DIR/.."; npm install -g npm@6.14.13; npm install sqlite3 --build-from-source; npm install; npm install argon2 --build-from-source; )

#install numactl
sudo yum install numactl -y

#install mongodb
sudo bash "$DIR/scripts/mongodb.install.sh"
if [ "$INSIDE_DOCKER" == "1" ]; then
    sudo sed -i 's/  fork/#  fork/g' /etc/mongod.conf
    sudo mongod -f /etc/mongod.conf &
fi

cp "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

sudo sed -e "s/Defaults requiretty/#Defaults requiretty/" /etc/sudoers | sudo tee /etc/sudoers2
sudo cp /etc/sudoers /etc/sudoers.bak
sudo cp -f /etc/sudoers2 /etc/sudoers
sudo rm -rf /etc/sudoers2
sudo chmod 0440 /etc/sudoers

sudo bash "$DIR/scripts/detect.init.sh"

#configure and start nginx
set +e
sudo countly save /etc/nginx/conf.d/default.conf "$DIR/config/nginx"
sudo countly save /etc/nginx/nginx.conf "$DIR/config/nginx"
sudo cp "$DIR/config/nginx.server.conf" /etc/nginx/conf.d/default.conf
sudo cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf
sudo systemctl restart nginx > /dev/null || echo "nginx service does not exist"
sudo systemctl enable nginx > /dev/null || echo "nginx service does not exist"
set -e

#create configuration files from samples
if [ ! -f "$DIR/../api/config.js" ]; then
	cp "$DIR/../api/config.sample.js" "$DIR/../api/config.js"
fi

if [ ! -f "$DIR/../frontend/express/config.js" ]; then
	cp "$DIR/../frontend/express/config.sample.js" "$DIR/../frontend/express/config.js"
fi

if [ ! -f "$DIR/../plugins/plugins.json" ]; then
	cp "$DIR/../plugins/plugins.default.json" "$DIR/../plugins/plugins.json"
fi

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" | sudo tee -a /etc/timezone >/dev/null
fi

#install plugins
node "$DIR/scripts/install_plugins"

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"

#get web sdk
sudo countly update sdk-web

# close google services for China area
if ping -c 1 google.com >> /dev/null 2>&1; then
    echo "Pinging Google successful. Enabling Google services."
else
    echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
    countly config "frontend.use_google" false --force
fi

#compile scripts for production
sudo countly task dist-all

# disable transparent huge pages
#countly thp

# after install call
sudo countly check after install

#finally start countly api and dashboard
if [ "$INSIDE_DOCKER" != "1" ]; then
    sudo countly start
else
    sudo pkill mongod
fi

bash "$DIR/scripts/done.sh";

ENABLED=$(getenforce)
if [ "$ENABLED" == "Enforcing" ]; then
  echo -e "\e[31mSELinux is enabled, please disable it or add nginx to exception for Countly to work properly\e[0m"
fi
