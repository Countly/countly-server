#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

if [ -n "$(command -v apt-get)" ]; then
    add-apt-repository -y ppa:ondrej/apache2
    apt-get update && apt-get install -y --force-yes openssl git g++ make binutils autoconf automake autotools-dev libtool pkg-config zlib1g-dev libcunit1-dev libssl-dev libxml2-dev libev-dev libevent-dev libjansson-dev libjemalloc-dev cython python3-dev python-setuptools
elif [ -n "$(command -v yum)" ]; then
    yum install -y openssl git gcc-c++ make binutils autoconf automake libtool pkgconfig zlib-devel openssl-devel libxml2-devel python-setuptools
fi
git clone https://github.com/nghttp2/nghttp2.git
cd nghttp2
export CFLAGS="-g -O2 -fPIC" && export CPPFLAGS="-fPIC" && autoreconf -i && automake && autoconf && ./configure --disable-examples --disable-app && make && make install
npm install -g --unsafe-perm node-gyp
