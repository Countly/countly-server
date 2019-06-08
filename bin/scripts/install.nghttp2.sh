#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

export LANGUAGE=en_US.UTF-8 ; export LC_ALL=en_US.UTF-8;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -n "$(command -v apt-get)" ] && [ "$INSIDE_DOCKER" != "1" ]; then
    add-apt-repository -y ppa:ondrej/apache2
    apt-get update && apt-get install -y --force-yes openssl git g++ make binutils autoconf automake autotools-dev libtool pkg-config zlib1g-dev libcunit1-dev libssl-dev libxml2-dev libev-dev libevent-dev libjansson-dev libjemalloc-dev cython python3-dev python-setuptools
elif [ -n "$(command -v yum)" ]; then
    if grep -q -i "release 6" /etc/redhat-release ; then
        wget ftp://ftp.pbone.net/mirror/ftp5.gwdg.de/pub/opensuse/repositories/home:/monkeyiq:/centos6updates/CentOS_CentOS-6/noarch/autoconf-2.69-12.2.noarch.rpm
        rpm -i --force autoconf-2.69-12.2.noarch.rpm
    fi

    yum install -y git make binutils autoconf automake makedepend libtool pkgconfig zlib-devel libxml2-devel python-setuptools
    wget https://www.openssl.org/source/openssl-1.0.2h.tar.gz
    tar -zxvf openssl-1.0.2h.tar.gz -C /usr/local/src
    cd /usr/local/src/openssl-1.0.2h
    ./config --prefix=/usr
    make depend
    make
    make install
    cd "$DIR"
fi

git clone https://github.com/nghttp2/nghttp2.git "$DIR/nghttp2"
cd "$DIR/nghttp2"
git checkout tags/v1.30.0
export CFLAGS="-g -O2 -fPIC" && export CPPFLAGS="-fPIC" && autoreconf -i && automake && autoconf && ./configure --disable-examples --disable-app && make && make install
npm install -g --unsafe-perm node-gyp

# cleanup
rm -rf "$DIR/nghttp2"
