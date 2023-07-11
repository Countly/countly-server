#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#prepopulate docker with predefined data
#bash /opt/countly/bin/backup/run.sh

#link nodejs if needed
set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	ln -s "$(which node)" /usr/bin/nodejs
elif [ ! -f "/usr/bin/node" ]; then
    ln -s "$(which nodejs)" /usr/bin/node
fi

cp -rf "$DIR/test.connection.js" /opt/countly/bin/scripts/test.connection.js
#until nc -z localhost 3001; do echo Waiting for Countly; sleep 1; done