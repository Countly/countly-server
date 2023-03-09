#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' "$DIR/../../frontend/express/version.info.js")"

echo "Installing prerequisites"
if [ "$1" = "zip" ]
then
    apt-get install -y zip
fi

echo "Updating core"
git pull

echo "Preparing package"
if [ "$1" = "zip" ]
then
(cd "$DIR/../../.." ;
zip -r "countly-community-edition-v$VERSION.zip" countly/ -x "countly/.git/*" "countly/api/config.js" "countly/api/node_modules/*" "countly/frontend/express/config.js" "countly/frontend/express/public/stylesheets/main.min.css" "countly/frontend/express/public/javascripts/countly/countly.config.js" "countly/frontend/express/public/userimages/*"  "countly/frontend/express/certificates/*" "countly/frontend/express/node_modules/*" "countly/log/countly-api.log" "countly/log/countly-dashboard.log" "countly/node_modules/*" "countly/plugins/plugins.json")
else
(cd "$DIR/../../.." ;
tar --exclude="countly/.git" --exclude="countly/api/config.js" --exclude="countly/api/node_modules" --exclude="countly/frontend/express/config.js" --exclude="countly/frontend/express/public/stylesheets/main.min.css" --exclude="countly/frontend/express/public/javascripts/countly/countly.config.js" --exclude="countly/frontend/express/public/userimages"  --exclude="countly/frontend/express/certificates" --exclude="countly/frontend/express/node_modules" --exclude="countly/log/countly-api.log" --exclude="countly/log/countly-dashboard.log" --exclude="countly/node_modules" --exclude="countly/plugins/plugins.json" -zcvf "countly-community-edition-v$VERSION.tar.gz" countly/)
fi

echo "Install package prepared"
