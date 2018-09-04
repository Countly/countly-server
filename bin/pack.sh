#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ ! -d "$DIR/../dist" ]; then
    mkdir $DIR/../dist/
fi

if [ ! -d "$DIR/../api" ]; then
    mkdir $DIR/../api/
fi

if [ ! -d "$DIR/../frontend" ]; then
    mkdir $DIR/../frontend/
fi

if [ ! -d "$DIR/../plugins" ]; then
    mkdir $DIR/../plugins/
fi

if [ ! -d "$DIR/../node_modules" ]; then
    mkdir $DIR/../node_modules/
fi

rsync -avL --progress $DIR/../api/ $DIR/../dist/api/
rsync -avL --progress $DIR/../frontend/ $DIR/../dist/frontend/
rsync -avL --progress $DIR/../plugins/ $DIR/../dist/plugins/

rsync -avL --progress $DIR/../Gruntfile.js $DIR/../dist/
rsync -avL --progress $DIR/../frontend/express/config.sample.js $DIR/../dist/frontend/express/config.js
rsync -avL --progress $DIR/../plugins/plugins.default.json $DIR/../dist/plugins/plugins.json

rsync -avL --progress $DIR/package/install_plugins.js $DIR/../dist/install_plugins.js

rsync -avL --progress $DIR/package/generate_package_json.js $DIR/../dist/generate_package_json.js

rsync -avL --progress $DIR/package/countly_marked_version.json $DIR/../dist/countly_marked_version.json

#Copy package.json into dist
rsync -avL --progress $DIR/../package.json $DIR/../dist/

#Copy node_modules for both api and dashboard
rsync -avL --progress $DIR/../node_modules/ $DIR/../dist/node_modules/
rsync -avL --progress $DIR/../node_modules/ $DIR/../dist/api/node_modules/
rsync -avL --progress $DIR/../node_modules/ $DIR/../dist/frontend/express/node_modules/

node $DIR/../dist/install_plugins;

node $DIR/../dist/generate_package_json;

sudo rm $DIR/../dist/api/package-lock.json
sudo rm $DIR/../dist/frontend/express/package-lock.json

sudo npm --prefix $DIR/../dist/api/ install --unsafe-perm;

sudo npm --prefix $DIR/../dist/frontend/express/ install --unsafe-perm;

#install grunt & npm modules
sudo npm --prefix $DIR/../dist/ install grunt --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-cli --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-contrib-jshint --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-contrib-concat --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-contrib-uglify --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-contrib-copy --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-contrib-cssmin --unsafe-perm --save-dev;
sudo npm --prefix $DIR/../dist/ install grunt-mocha-test --unsafe-perm --save-dev;


find ./dist/frontend/express/ -name '*.node' -exec cp -prv '{}' './dist/frontend/express/' ';'
find ./dist/frontend/express/ -name '*.node' -exec cp -prv '{}' './executables/dashboard/' ';'

#compile scripts for production
cd $DIR/../dist/ && grunt dist-all

#package api
pkg $DIR/../dist/api/package.json --out-path $DIR/../executables/api/;

#package dashboard
pkg $DIR/../dist/frontend/express/package.json --out-path $DIR/../executables/dashboard/;
