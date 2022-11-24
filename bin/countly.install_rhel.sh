#!/bin/bash
set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$DIR/scripts/logo.sh";

# prerequisite per release
yum -y install wget openssl-devel make git sqlite unzip bzip2

yum install -y python3-pip
pip3 install pip --upgrade
pip3 install meld3
pip3 install supervisor --ignore-installed meld3
yum -y install python3-setuptools

if grep -q -i "release 8" /etc/redhat-release ; then
    yum -y install python3-policycoreutils
    yum -y group install "Development Tools"

    if [ ! -f "/etc/centos-release" ]; then
        dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
    fi

    yum -y install epel-release
    # see https://github.com/koalaman/shellcheck/issues/1871
    wget https://github.com/koalaman/shellcheck/releases/download/v0.7.1/shellcheck-v0.7.1.linux.x86_64.tar.xz
    tar -C /usr/local/bin/ -xf shellcheck-v0.7.1.linux.x86_64.tar.xz --no-anchored 'shellcheck' --strip=1

    ln -sf /usr/local/bin/shellcheck /usr/bin/shellcheck

    if [ ! -x "$(command -v python)" ]; then
        ln -sf /usr/bin/python3 /usr/bin/python
    fi

    #Install raven-release for ipa-gothic-fonts required by puppeteer
    yum -y install https://pkgs.dyn.su/el8/base/x86_64/raven-release-1.0-3.el8.noarch.rpm
elif grep -q -i "release 7" /etc/redhat-release ; then
    yum -y install policycoreutils-python
    #install nginx
    echo "[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/rhel/7/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/nginx.repo

    if [ -f "/etc/centos-release" ]; then
        yum -y --enablerepo=extras install epel-release
        yum install centos-release-scl -y
    fi

    yum install devtoolset-8 -y
    yum install devtoolset-8-gcc* -y
    #shellcheck source=/dev/null
    source /opt/rh/devtoolset-8/enable
    yum install -y epel-release
    yum install -y ShellCheck

else
    echo "Unsupported OS version, only support RHEL/Centos 8 and 7"
    exit 1
fi

ln -sf /usr/local/bin/echo_supervisord_conf /usr/bin/echo_supervisord_conf
ln -sf /usr/local/bin/pidproxy /usr/bin/pidproxy
ln -sf /usr/local/bin/supervisorctl /usr/bin/supervisorctl
ln -sf /usr/local/bin/supervisord /usr/bin/supervisord

#Install dependancies required by the puppeteer
yum -y install alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 GConf2.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils ipa-gothic-fonts
#Install nss after installing above dependencies
yum update nss -y

#install nodejs
curl -sL https://rpm.nodesource.com/setup_14.x | bash -
yum install -y nodejs

set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	ln -s "$(which node)" /usr/bin/nodejs
elif [ ! -f "/usr/bin/node" ]; then
    ln -s "$(which nodejs)" /usr/bin/node
fi

#install nginx
yum -y install nginx

set +e
useradd www-data
unalias cp
set -e

if grep -q -i "release 8" /etc/redhat-release ; then
    chown -R www-data:www-data /var/lib/nginx
fi

#install sendmail
yum -y install sendmail
service sendmail start

#install npm modules
( cd "$DIR/..";  sudo npm install -g npm@6.14.13;  sudo npm install --unsafe-perm=true --allow-root; sudo npm install argon2 --build-from-source; )

#install numactl
yum install numactl -y

#install mongodb
bash "$DIR/scripts/mongodb.install.sh"

cp "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

sed -e "s/Defaults requiretty/#Defaults requiretty/" /etc/sudoers > /etc/sudoers2
mv /etc/sudoers /etc/sudoers.bak
mv /etc/sudoers2 /etc/sudoers
chmod 0440 /etc/sudoers

bash "$DIR/scripts/detect.init.sh"

#configure and start nginx
set +e
countly save /etc/nginx/conf.d/default.conf "$DIR/config/nginx"
countly save /etc/nginx/nginx.conf "$DIR/config/nginx"
cp "$DIR/config/nginx.server.conf" /etc/nginx/conf.d/default.conf
cp "$DIR/config/nginx.conf" /etc/nginx/nginx.conf
service nginx restart
chkconfig nginx on
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
    echo "Etc/UTC" > /etc/timezone
fi

#install plugins
node "$DIR/scripts/install_plugins"

#load city data into database
nodejs "$DIR/scripts/loadCitiesInDb.js"

#get web sdk
countly update sdk-web

# close google services for China area
if ping -c 1 google.com >> /dev/null 2>&1; then
    echo "Pinging Google successful. Enabling Google services."
else
    echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
    countly config "frontend.use_google" false --force
fi

#compile scripts for production
countly task dist-all

# disable transparent huge pages
#countly thp

# after install call
countly check after install

#finally start countly api and dashboard
countly start

bash "$DIR/scripts/done.sh";

ENABLED=$(getenforce)
if [ "$ENABLED" == "Enforcing" ]; then
  echo -e "\e[31mSELinux is enabled, please disable it or add nginx to exception for Countly to work properly\e[0m"
fi
