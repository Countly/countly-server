#!/bin/bash

if [ -f /opt/countly/plugins/plugins.json ]; then
	echo "[docker] Plugins have been built, skipping rebuilding"
else
	if [ -z "$COUNTLY_PLUGINS" ]; then
		if [ -z "$COUNTLY_DEFAULT_PLUGINS" ]; then
			echo "[docker] ERROR: neither COUNTLY_PLUGINS, nor COUNTLY_DEFAULT_PLUGINS is set, no plugins to postinstall"
			exit 1
		fi

		COUNTLY_PLUGINS="$COUNTLY_DEFAULT_PLUGINS"
		echo "[docker] Using default plugin list: $COUNTLY_PLUGINS"
	else
		echo "[docker] Using COUNTLY_PLUGINS: $COUNTLY_PLUGINS"
	fi

	if [[ $COUNTLY_PLUGINS == *"drill"* ]] && [[ $COUNTLY_PLUGINS != *"license"* ]]; then
    	COUNTLY_PLUGINS=${COUNTLY_PLUGINS/drill/license,drill}
		echo "[docker] added license plugin: $COUNTLY_PLUGINS"
	fi

	a=$(echo "$COUNTLY_PLUGINS" | tr ',' '\n')
	printf %s\\n "${a[@]}"|sed 's/["\]/\\&/g;s/.*/"&"/;1s/^/[/;$s/$/]/;$!s/$/,/' > /opt/countly/plugins/plugins.json

        #load city data into database
        node "/opt/countly/bin/scripts/loadCitiesInDb.js"

	while read -r plugin; do
      if [ -f "/opt/countly/plugins/$plugin/install.js" ]; then
        echo "[docker] Installing ${plugin}:"
	    node "/opt/countly/plugins/$plugin/install.js"
	    echo "[docker] Done installing ${plugin}."
	  else
	  	echo "[docker] Nothing to install for ${plugin}"
	  fi
	done <<< "$a"

	(cd /opt/countly && npx grunt dist-all)

fi
