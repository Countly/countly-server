#!/bin/bash

#prepopulate docker with predefined data
#bash /opt/countly/bin/backup/run.sh

# shellcheck disable=SC2016
mongosh mongodb/countly --eval 'db.plugins.update({_id: "plugins"}, {$set:{"api.batch_processing":false, "api.batch_read_processing": false, "drill.record_meta": true, "funnels.funnel_caching": false}}, {upsert:true})'

#link nodejs if needed
set +e
NODE_JS_CMD=$(which nodejs)
set -e
if [[ -z "$NODE_JS_CMD" ]]; then
	  ln -s "$(which node)" /usr/bin/nodejs
elif [ ! -f "/usr/bin/node" ]; then
    ln -s "$(which nodejs)" /usr/bin/node
fi
