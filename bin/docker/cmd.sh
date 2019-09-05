#!/bin/bash

/opt/countly/bin/docker/postinstall.sh

case "$COUNTLY_CONTAINER" in
  "api" )
    exec /usr/local/bin/node /opt/countly/api/api.js
    ;;

  "frontend" )
   	npx grunt dist-all
	exec /usr/local/bin/node /opt/countly/frontend/express/app.js
    ;;

   * )
    # Run custom command. Thanks to this line we can still use 
    # "docker run our_image /bin/bash" and it will work
    exec $CMD ${@:2}
    ;;
esac