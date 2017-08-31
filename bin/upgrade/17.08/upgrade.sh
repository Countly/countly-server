#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#enable command line
bash $DIR/scripts/detect.init.sh

#rename config property
WARN="$(countly config "logs.warning")"
countly config "logs.warning" null
countly config "logs.warn" $WARN
