#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

mv "$DIR/../frontend/express/public/javascripts/countly/countly.config.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.backup.20.11.js"
cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"
