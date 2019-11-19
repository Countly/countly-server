#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../../../" && pwd )"

#remove flash crosdomain origin
rm -rf "$DIR/frontend/express/public/crossdomain.xml"
