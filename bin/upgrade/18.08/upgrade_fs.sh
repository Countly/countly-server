#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
	curl -sL https://rpm.nodesource.com/setup_8.x | bash -
	yum clean all
	yum remove -y nodejs
	yum install -y nodejs bzip2
	if grep -q -i "release 6" /etc/redhat-release ; then
		bash "$DIR/scripts/install-google-chrome.sh";
	else
		yum install -y pango.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXtst.x86_64 cups-libs.x86_64 libXScrnSaver.x86_64 libXrandr.x86_64 GConf2.x86_64 alsa-lib.x86_64 atk.x86_64 gtk3.x86_64 ipa-gothic-fonts xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-utils xorg-x11-fonts-cyrillic xorg-x11-fonts-Type1 xorg-x11-fonts-misc
	fi
fi

if [ -f /etc/lsb-release ]; then
	wget -qO- https://deb.nodesource.com/setup_8.x | bash -
	apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
	apt-get install -y  bzip2 gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
fi

#enable command line
bash "$DIR/scripts/detect.init.sh"

#upgrade config
mv "$DIR/../frontend/express/public/javascripts/countly/countly.config.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.backup.18.08.js"
cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf "$DIR/../node_modules"

#remove predefined locale file, it should fallback to default one
rm -rf "$DIR/../frontend/express/public/localization/min/locale_en.properties"


countly upgrade

#upgrade plugins
countly plugin upgrade push
cd "$DIR/../plugins/push/api/parts/apn" && npm install --unsafe-perm
countly plugin upgrade revenue
countly plugin upgrade attribution
countly plugin upgrade crashes
countly plugin upgrade errorlogs
countly plugin upgrade star-rating
countly plugin upgrade logger
countly plugin upgrade populator
countly plugin upgrade funnels
countly plugin upgrade data_migration
countly plugin upgrade retention_segments
countly plugin enable onboarding

# close google services for China area
if ping -c 1 google.com >> /dev/null 2>&1; then
    echo "Pinging Google successful. Enabling Google services."
else
    echo "Cannot reach Google. Enabling EChartMap."
    countly plugin enable EChartMap
fi

#install dependencies, process files and restart countly
countly upgrade
