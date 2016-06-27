#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#install push dependencies
bash $DIR/scripts/install.nghttp2.sh

(cd $DIR/.. ; npm install readable-stream)

#upgrade live plugin if it is installed
countly plugin upgrade push
countly plugin upgrade live
countly plugin upgrade reports

countly update sdk-web
countly upgrade