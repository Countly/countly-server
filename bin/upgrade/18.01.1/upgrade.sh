#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#upgrade existing plugins
countly plugin upgrade crashes

#add indexes
nodejs $DIR/scripts/add_indexes.js

#remove stuck push collections
nodejs $DIR/scripts/push_clear.js

#install dependencies, process files and restart countly
countly upgrade