#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f /etc/redhat-release ]; then
    #install latest mongodb 
    
    #select source based on release
	if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
        echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6/mongodb-org/3.2/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/mongodb-org-3.2.repo
    else
        echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/3.2/x86_64/
gpgcheck=0
enabled=1" > /etc/yum.repos.d/mongodb-org-3.2.repo
    fi
    yum install -y nodejs mongodb-org
    
    #disable transparent-hugepages (requires reboot)
    cp -f $DIR/disable-transparent-hugepages /etc/init.d/disable-transparent-hugepages
    chmod 755 /etc/init.d/disable-transparent-hugepages
    chkconfig --add disable-transparent-hugepages
fi

if [ -f /etc/lsb-release ]; then
    #install latest mongodb 
	apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
    echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list
    apt-get update
    #install mongodb
    apt-get -y --force-yes install mongodb-org || (echo "Failed to install mongodb." ; exit)
    
    #disable transparent-hugepages (requires reboot)
    cp -f $DIR/disable-transparent-hugepages /etc/init.d/disable-transparent-hugepages
    chmod 755 /etc/init.d/disable-transparent-hugepages
    update-rc.d disable-transparent-hugepages defaults
fi

#backup config and remove configuration to prevent duplicates
cp /etc/mongod.conf /etc/mongod.conf.bak
sed -i '/operationProfiling:/d' /etc/mongod.conf
sed -i '/slowOpThresholdMs:/d' /etc/mongod.conf
sed -i '/mode:/d' /etc/mongod.conf

#new slow query log limit
echo "operationProfiling:
  slowOpThresholdMs: 10000
  mode: slowOp" >> /etc/mongod.conf
  
if [ -f /etc/redhat-release ]; then
    #mongodb might need to be started
    if [ "$(rpm -qa \*-release | grep -Ei "oracle|redhat|centos" | cut -d"-" -f3)" -eq "6" ]; then
        service mongod restart
    else
        systemctl restart mongod
    fi
fi

if [ -f /etc/lsb-release ]; then
    if [[ `/sbin/init --version` =~ upstart ]]; then
        restart mongod
    else
        systemctl restart mongod
    fi 2> /dev/null
fi
