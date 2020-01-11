#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#install test dependencies
( cd "$DIR/../../../" ; npm install )
#run tests
( cd "$DIR/../../../" ; npm test )
