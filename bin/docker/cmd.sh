#!/bin/bash

if [ -z "$CLY_PLUGINS" ]; then
	if [ -f $DIR/../../plugins/plugins.json ]; then
		echo "[docker] Using existing plugins.json"
	else
		echo "[docker] ERROR: neither CLY_PLUGINS env var, or plugins.json exists"
		exit 1
	fi
else
	echo "[docker] Using CLY_PLUGINS: $CLY_PLUGINS"
	a=($(echo "$CLY_PLUGINS" | tr ',' '\n'))
	echo "[docker] Written plugins:"
	printf %s\\n "${a[@]}"|sed 's/["\]/\\&/g;s/.*/"&"/;1s/^/[/;$s/$/]/;$!s/$/,/'
	printf %s\\n "${a[@]}"|sed 's/["\]/\\&/g;s/.*/"&"/;1s/^/[/;$s/$/]/;$!s/$/,/' > $DIR/../../plugins/plugins.json
fi

bash $DIR/../scripts/countly.install.plugins.sh

if [ "$0" -eq "api" ]; then
	node ../../api/api.js
elif [ "$0" -eq "frontend" ]; then
	grunt dist-all
	node ../../frontend/express/app.js
else
	echo "[docker] First cmd.sh argument must equal 'api' or 'frontend', but was $0"
	exit 1
elif
