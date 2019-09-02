#!/bin/bash

bash $DIR/../scripts/logo.sh;

# Used to build resources
npm i -g grunt-cli

# Node.js stuff
cp -n $DIR/../../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../../frontend/express/public/javascripts/countly/countly.config.js
cp -n $DIR/../../frontend/express/config.sample.js $DIR/../../frontend/express/config.js
cd $DIR/../.. && npm install
