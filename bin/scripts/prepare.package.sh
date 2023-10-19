#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../" && pwd )"
NAME=$(basename "$DIR");
VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' "$DIR/frontend/express/version.info.js")"

echo "Installing prerequisites"
if [ "$1" = "zip" ]; then
    apt-get install -y zip
fi

echo "Updating core"
git pull

echo "Preparing package"
if [ "$1" = "zip" ]; then
    (cd "$DIR/../" ;
    zip -r "countly-community-edition-v$VERSION.zip" "$NAME/" -x "$NAME/.git/*" "$NAME/api/config.js" "$NAME/api/node_modules/*" "$NAME/frontend/express/config.js" "$NAME/frontend/express/public/stylesheets/main.min.css" "$NAME/frontend/express/public/javascripts/$NAME/countly.config.js" "$NAME/frontend/express/public/userimages/*"  "$NAME/frontend/express/certificates/*" "$NAME/frontend/express/node_modules/*" "$NAME/log/countly-api.log" "$NAME/log/countly-dashboard.log" "$NAME/node_modules/*" "$NAME/plugins/plugins.json")
else
    (cd "$DIR/../" ;
    tar --exclude="$NAME/.git" --exclude="$NAME/api/config.js" --exclude="$NAME/api/node_modules" --exclude="$NAME/frontend/express/config.js" --exclude="$NAME/frontend/express/public/stylesheets/main.min.css" --exclude="$NAME/frontend/express/public/javascripts/$NAME/countly.config.js" --exclude="$NAME/frontend/express/public/userimages"  --exclude="$NAME/frontend/express/certificates" --exclude="$NAME/frontend/express/node_modules" --exclude="$NAME/log/countly-api.log" --exclude="$NAME/log/countly-dashboard.log" --exclude="$NAME/node_modules" --exclude="$NAME/plugins/plugins.json" --transform "s/$NAME/countly/" -zcvf "countly-community-edition-v$VERSION.tar.gz" "$NAME/")
fi

echo "Install package prepared"
