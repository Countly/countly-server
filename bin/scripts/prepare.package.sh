#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Installing prerequisites"
apt-get install zip -y

echo "Updating core"
git pull

echo "Preparing package"
(cd $DIR ;
zip -r countly.install.zip api bin frontend log plugins supervisor test CHANGELOG Dockerfile Gruntfile.js package.json -x "api/config.js" "api/node_modules/*" "frontend/express/config.js" "frontend/express/public/stylesheets/main.min.css" "frontend/express/public/javascripts/countly/countly.config.js" "frontend/express/public/userimages/*"  "frontend/express/certificates/*" "frontend/express/node_modules/*" "log/countly-api.log" "log/countly-dashboard.log" "node_modules/*" "plugins/plugins.json")

echo "Install package prepared: $DIR/countly.install.zip"
