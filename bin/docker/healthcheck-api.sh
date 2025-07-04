#!/bin/bash

if [ "$COUNTLY_CONFIG_API_API_SSL_ENABLED" = true ]; then
    curl --fail --no-progress-meter -k https://localhost:3001/o/ping || exit 1
  else
    curl --fail --no-progress-meter http://localhost:3001/o/ping || exit 1
fi
