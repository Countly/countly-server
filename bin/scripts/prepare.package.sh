#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' $DIR/../../frontend/express/version.info.js)"

echo "Installing prerequisites"
apt-get install zip -y

echo "Updating core"
git pull

echo "Preparing package"
(cd $DIR/../../.. ;
zip -r countly-community-edition-v$VERSION.zip countly/ -x "countly/.git/*" "countly/api/config.js" "countly/api/node_modules/*" "countly/frontend/express/config.js" "countly/frontend/express/public/stylesheets/main.min.css" "countly/frontend/express/public/javascripts/countly/countly.config.js" "countly/frontend/express/public/userimages/*"  "countly/frontend/express/certificates/*" "countly/frontend/express/node_modules/*" "countly/log/countly-api.log" "countly/log/countly-dashboard.log" "countly/node_modules/*" "countly/plugins/plugins.json")

echo "Install package prepared"
