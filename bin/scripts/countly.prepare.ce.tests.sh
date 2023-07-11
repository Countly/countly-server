#!/bin/bash

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


#until nc -z localhost 3001; do echo Waiting for Countly; sleep 1; done