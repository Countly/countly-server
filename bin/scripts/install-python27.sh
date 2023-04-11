#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

export LANGUAGE=en_US.UTF-8 ; export LC_ALL=en_US.UTF-8;

# Install compiler
yum groupinstall -y "Development Tools"

# Install Python 2.7
cd /usr/src
wget https://www.python.org/ftp/python/2.7.10/Python-2.7.10.tgz
tar xzf Python-2.7.10.tgz
cd Python-2.7.10
./configure --with-zlib=/usr/include
make altinstall

ln -sf /usr/local/bin/python2.7 /usr/bin/python2.7

# Install pip for Python 2.7
yum install -y python-pip
cd /usr/src
wget https://bootstrap.pypa.io/get-pip.py
python2.7 get-pip.py
ln -sf /usr/local/bin/pip2.7 /usr/bin/pip2.7

# Install meld3 & Supervisor
yum install -y python-meld3

pip2.7 install supervisor --ignore-installed meld3
ln -sf /usr/local/bin/supervisord /usr/bin/supervisord
