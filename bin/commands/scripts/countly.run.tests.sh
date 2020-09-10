#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#set test configs
countly config "api.batch_processing" "false"
countly config "api.batch_read_processing" "false"
countly config "drill.record_meta" "true"

countly restart

#install test dependencies
( cd "$DIR/../../../" ; sudo npm install --unsafe-perm )
#run tests
( cd "$DIR/../../../" ; npm test )