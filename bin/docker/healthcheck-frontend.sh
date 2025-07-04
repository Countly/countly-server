#!/bin/bash

if [ "$COUNTLY_CONFIG_FRONTEND_WEB_SSL_ENABLED" = true ]; then
    curl --fail --no-progress-meter -k https://localhost:6001/o/ping || exit 1
  else
    curl --fail --no-progress-meter http://localhost:6001/o/ping || exit 1
fi
