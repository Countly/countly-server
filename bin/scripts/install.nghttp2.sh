#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
fi

export LANGUAGE=en_US.UTF-8 ; export LC_ALL=en_US.UTF-8;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -n "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y --force-yes git g++ make binutils autoconf automake autotools-dev libtool pkg-config zlib1g-dev libcunit1-dev libssl-dev libxml2-dev libev-dev libevent-dev libjansson-dev libjemalloc-dev cython python3-dev python-setuptools
elif [ -n "$(command -v yum)" ]; then
    yum install -y git make binutils autoconf automake libtool pkgconfig zlib-devel libxml2-devel

    if grep -q -i "release 8" /etc/redhat-release ; then
        yum config-manager --set-enabled powertools
        yum install -y makedepend
    elif grep -q -i "release 7" /etc/redhat-release ; then
        yum install -y python-setuptools makedepend
    fi
fi

#clean folder if exists
if [ -d "$DIR/nghttp2" ]; then
    rm -rf "$DIR/nghttp2"
fi

git clone https://github.com/nghttp2/nghttp2.git "$DIR/nghttp2"
cd "$DIR/nghttp2"
git checkout tags/v1.30.0
export CFLAGS="-g -O2 -fPIC" && export CPPFLAGS="-fPIC" && autoreconf -i && automake && autoconf && ./configure --disable-examples --disable-app && make && make install
npm install -g --unsafe-perm node-gyp
