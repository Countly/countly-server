#!/bin/bash

if [ -f /opt/countly/plugins/plugins.json ]; then
	echo "[docker] Plugins have been built, skipping rebuilding"
else
	if [ -z "$COUNTLY_PLUGINS" ]; then
		COUNTLY_PLUGINS="$COUNTLY_DEFAULT_PLUGINS"
		echo "[docker] Using default plguin list: $COUNTLY_PLUGINS"
	else
		echo "[docker] Using COUNTLY_PLUGINS: $COUNTLY_PLUGINS"
	fi

	a=$(echo "$COUNTLY_PLUGINS" | tr ',' '\n')
	printf %s\\n "${a[@]}"|sed 's/["\]/\\&/g;s/.*/"&"/;1s/^/[/;$s/$/]/;$!s/$/,/' > /opt/countly/plugins/plugins.json

	while read -r plugin; do
	  echo "[docker] Installing ${plugin}:"
	  /usr/local/bin/node "/opt/countly/plugins/$plugin/install.js"
	  echo "[docker] Done installing ${plugin}."
	done <<< "$a"
fi

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