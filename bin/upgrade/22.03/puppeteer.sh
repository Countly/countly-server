#!/bin/bash
if [ -f /etc/redhat-release ]; then
	if grep -q -i "release 8" /etc/redhat-release ; then
		#Install raven-release for ipa-gothic-fonts required by puppeteer
		yum -i install https://pkgs.dyn.su/el8/base/x86_64/raven-release-1.0-2.el8.noarch.rpm
	fi

	#Install dependancies required by the puppeteer
	yum install -y alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 GConf2.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils ipa-gothic-fonts
	#Install nss after installing above dependencies
	yum update nss -y
fi

if [ -f /etc/lsb-release ]; then
	#Install dependancies required by the puppeteer
	apt-get install -y  libgbm-dev libgbm1 gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
fi
