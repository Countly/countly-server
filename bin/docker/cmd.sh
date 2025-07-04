#!/bin/bash

/opt/countly/bin/docker/postinstall.sh

if [ -z "$COUNTLY_CONFIG_HOSTNAME" ]; then
  echo "[docker] ERROR: Please set COUNTLY_CONFIG_HOSTNAME with your planned Countly hostname, i.e. countly.example.com"
fi

case "$COUNTLY_CONTAINER" in
  "api" )
    exec node /opt/countly/api/api.js
    ;;

  "frontend" )
  	exec node /opt/countly/frontend/express/app.js
    ;;

  "ingestor" )
    exec node /opt/countly/api/ingestor.js
    ;;

  "aggregator" )
    exec node /opt/countly/api/aggregator.js
    ;;

  "jobserver" )
    exec node /opt/countly/core/jobServer/index.js
    ;;

   * )
    # Run custom command. Thanks to this line we can still use
    # "docker run our_image /bin/bash" and it will work
    exec "$CMD" "${@:2}"
    ;;
esac