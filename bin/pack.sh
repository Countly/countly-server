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

cd $DIR/../dist/

sudo npm --prefix $DIR/../dist/ install;

node $DIR/../dist/install_plugins;

pkg $DIR/../dist/package.json --out-path $DIR/../executables/;
