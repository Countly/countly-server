#!/usr/bin/env bash

exec /usr/bin/supervisord --nodaemon --configuration /opt/countly/bin/config/supervisord.conf
