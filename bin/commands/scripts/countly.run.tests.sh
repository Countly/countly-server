#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#set test configs
countly config "api.batch_processing" "false"
countly config "api.batch_read_processing" "false"
countly config "drill.record_meta" "true"

countly restart

#run tests
( cd "$DIR/../../../" ; npm test )
