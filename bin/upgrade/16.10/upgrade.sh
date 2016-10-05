#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

pkill -f executor.js

#upgrade live plugin if it is installed
countly plugin upgrade push

countly update sdk-web

countly upgrade