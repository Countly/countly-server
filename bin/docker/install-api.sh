#!/bin/bash

bash $DIR/../scripts/logo.sh;

# Required by reverse geocoder
apt -y install sqlite3

# Required by push plugin
git clone https://github.com/nghttp2/nghttp2.git $DIR/nghttp2
cd $DIR/nghttp2
git checkout tags/v1.30.0
autoreconf -i && automake && autoconf && ./configure --disable-examples --disable-app && make && make install

# Node.js stuff
cp -n $DIR/../../api/config.sample.js $DIR/../../api/config.js
cd $DIR/../.. && npm install
