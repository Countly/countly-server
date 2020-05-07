#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ ! -z "$1" -a -d "$(dirname "$1")" -a "$(basename "$1")" = "mongod.conf" ]; then
	MONGOD_CONF="$1"
else
	MONGOD_CONF=/etc/mongod.conf
fi

if [ -f /etc/redhat-release ]; then
    #install latest mongodb

    #select source based on release
	if grep -q -i "release 6" /etc/redhat-release ; then
        echo "[mongodb-org-3.6]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6/mongodb-org/3.6/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc" > /etc/yum.repos.d/mongodb-org-3.6.repo
    elif grep -q -i "release 7" /etc/redhat-release ; then
        echo "[mongodb-org-3.6]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/3.6/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc" > /etc/yum.repos.d/mongodb-org-3.6.repo
    fi
    yum install -y nodejs mongodb-org

    #disable transparent-hugepages (requires reboot)
    cp -f "$DIR/disable-transparent-hugepages" /etc/init.d/disable-transparent-hugepages
    chmod 755 /etc/init.d/disable-transparent-hugepages
    chkconfig --add disable-transparent-hugepages
elif [ -f /etc/lsb-release ]; then
    #install latest mongodb
	sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
    UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

    if [ "$UBUNTU_YEAR" == "14" ]
    then
		echo "deb [ arch=amd64 ] http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
    elif [ "$UBUNTU_YEAR" == "16" ]
    then
        echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
    else
        echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
    fi
    apt-get update
    #install mongodb
    DEBIAN_FRONTEND="noninteractive" apt-get -y install mongodb-org || (echo "Failed to install mongodb." ; exit)

    #disable transparent-hugepages (requires reboot)
    cp -f "$DIR/disable-transparent-hugepages" /etc/init.d/disable-transparent-hugepages
    chmod 755 /etc/init.d/disable-transparent-hugepages
    update-rc.d disable-transparent-hugepages defaults
elif [ -x /usr/local/bin/brew ]; then
	brew tap mongodb/brew
	brew install mongodb-community@3.6
	MONGOD_CONF=/usr/local/etc/mongod.conf
fi

bash "$DIR/mongodb.init.logrotate.sh" "$MONGOD_CONF"

#backup config and remove configuration to prevent duplicates
cp "$MONGOD_CONF" "$MONGOD_CONF".bak
nodejs "$DIR/configure_mongodb.js" "$MONGOD_CONF"

if [ -f /etc/redhat-release ]; then
    #mongodb might need to be started
    if grep -q -i "release 6" /etc/redhat-release ; then
        service mongod restart || echo "mongodb service does not exist"
    else
        systemctl restart mongod || echo "mongodb systemctl job does not exist"
    fi
elif [ -f /etc/lsb-release ]; then
    if [[ "$(/sbin/init --version)" =~ upstart ]]; then
        restart mongod || echo "mongodb upstart job does not exist"
    else
        systemctl restart mongod || echo "mongodb systemctl job does not exist"
    fi
elif [ -x /usr/local/bin/brew ]; then
	sudo brew services restart mongodb/brew/mongodb-community@3.6
fi
