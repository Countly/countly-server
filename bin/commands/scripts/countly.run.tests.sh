#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#install test dependencies
( cd "$DIR/../../../" ; sudo npm install --unsafe-perm )
#run tests
( cd "$DIR/../../../" ; npm test )