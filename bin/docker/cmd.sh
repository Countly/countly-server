#!/bin/bash

/opt/countly/bin/docker/postinstall.sh

# arm64 images ship Debian's chromium instead of Puppeteer's Chrome (see Dockerfile-api)
if [ -z "$PUPPETEER_EXECUTABLE_PATH" ] && [ -x /usr/bin/chromium ]; then
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
fi

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

   * )
    # Run custom command. Thanks to this line we can still use 
    # "docker run our_image /bin/bash" and it will work
    exec "$CMD" "${@:2}"
    ;;
esac