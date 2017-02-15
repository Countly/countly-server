#!/usr/bin/env bash

/usr/bin/nodejs /opt/countly/bin/scripts/create_nginx_conf.js
exec /usr/sbin/nginx
