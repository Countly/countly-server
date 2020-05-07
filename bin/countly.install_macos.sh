#!/bin/bash
set -e

if [ $EUID = 0 -a ! -z "$SUDO_USER" ]; then
	# OK, we have to go back to non-superuser because brew installations don't work as root.
   sudo -u $SUDO_USER bash "$0" "$@"
elif [ $EUID != 0 -a "$SUDO_USER" != "root" ]; then
   echo "Please execute Countly installation script with a superuser..." 1>&2
   exit 1
else
	INSTALL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

	bash "$INSTALL_DIR/scripts/logo.sh";

	#install brew
	#Xcode or the Xcode command-line tools were installed when we installed brew.
	if [ ! -x /usr/local/bin/brew ]
	then
	   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
	fi

	#install and start logrotate
	brew install logrotate
	sudo brew services start logrotate

	#install wget (since Count.ly uses that instead of curl)
	brew install wget

	#install nginx
	brew install nginx
	if [ -z "$(sudo -u www-data echo 'exists' 2>/dev/null)" ]; then
		sudo sysadminctl -addUser www-data -fullName 'WWW-data'
	    sudo dscl . -create /Users/www-data IsHidden 1
		#sudo dscl . -delete "/SharePoints/WWW-data's Public Folder"
	fi

	#install nodeenv and nodejs
	brew install nodeenv
	LATESTVERSION="$(nodeenv -l 2>&1 | tr -s "\t" "\n" | egrep '^10\..+' | tail -1)"
	sudo rm -rf "$INSTALL_DIR/../.nodeenv"
	nodeenv -n "$LATESTVERSION" "$INSTALL_DIR/../.nodeenv"
	source "$INSTALL_DIR/../.nodeenv/bin/activate"

	set +e
	NODE_JS_CMD=$(which nodejs)
	set -e

	#install grunt & npm modules
	( cd "$INSTALL_DIR/.." ;  npm install npm@6.4.1 -g; npm --version;  npm install -g grunt-cli --unsafe-perm ; npm install --unsafe-perm )

	( cd "$INSTALL_DIR/.." && npm install argon2 --build-from-source )

	#install mongodb
	set -x
	bash -x "$INSTALL_DIR/scripts/mongodb.install.sh" /usr/local/etc/mongod.conf

	cp "$INSTALL_DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$INSTALL_DIR/../frontend/express/public/javascripts/countly/countly.config.js"

	bash -x "$INSTALL_DIR/scripts/detect.init.sh"

	#configure and start nginx
	set +e
	if [ ! -d /usr/local/etc/nginx/conf.d ]; then
		mkdir /usr/local/etc/nginx/conf.d
	fi
	if [ -f /usr/local/etc/nginx/conf.d/default.conf ]; then
		countly save /usr/local/etc/nginx/conf.d/default.conf "$INSTALL_DIR/config/nginx"
	else
		touch "$INSTALL_DIR/config/nginx/default.conf"
	fi
	countly save /usr/local/etc/nginx/nginx.conf "$INSTALL_DIR/config/nginx"
	cp "$INSTALL_DIR/config/nginx.server.conf" /usr/local/etc/nginx/conf.d/default.conf
	cat "$INSTALL_DIR/config/nginx.conf" \
		| sed -E -e 's,user www-data;,#user www-data;,' \
		| sed -E -e 's,/var/run/nginx.pid,/var/run/nginx/nginx.pid,' \
		| sed -E -e 's, /var/, /usr/local/var/,' \
        | sed -E -e 's, /etc/, /usr/local/etc/,' \
        | sed -E -e 's,^([[:space:]]+)(include /usr/local/etc/nginx/sites-enabled/\*;)$,\1\2~\1include /usr/local/etc/nginx/servers/\*;,' \
        | tr '~' '\n' \
        >/usr/local/etc/nginx/nginx.conf
	sudo brew services restart nginx
	#sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.nginx.plist
	#sudo defaults write /Library/LaunchDaemons/homebrew.mxcl.nginx.plist UserName 'www-data'
	#sudo chmod a+r /Library/LaunchDaemons/homebrew.mxcl.nginx.plist
	#sudo chown -R www-data /usr/local/var/log/nginx /usr/local/var/run/nginx
	#sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.nginx.plist
	set -e

	#create configuration files from samples
	if [ ! -f "$INSTALL_DIR/../api/config.js" ]; then
		cp "$INSTALL_DIR/../api/config.sample.js" "$INSTALL_DIR/../api/config.js"
	fi

	if [ ! -f "$INSTALL_DIR/../frontend/express/config.js" ]; then
		cp "$INSTALL_DIR/../frontend/express/config.sample.js" "$INSTALL_DIR/../frontend/express/config.js"
	fi

	if [ ! -f "$INSTALL_DIR/../plugins/plugins.json" ]; then
		cp "$INSTALL_DIR/../plugins/plugins.default.json" "$INSTALL_DIR/../plugins/plugins.json"
	fi

	#install nghttp2
	brew install nghttp2
	npm install --unsafe-perm node-gyp

	#install plugins
	node "$INSTALL_DIR/scripts/install_plugins"

	#get web sdk
	countly update sdk-web

	# close google services for China area
	if ping -c 1 google.com >> /dev/null 2>&1; then
		echo "Pinging Google successful. Enabling Google services."
		countly plugin disable EChartMap
	else
		echo "Cannot reach Google. Disabling Google services. You can enable this from Configurations later."
		countly config "frontend.use_google" false
		countly plugin enable EChartMap
	fi

	#compile scripts for production
	cd "$INSTALL_DIR/.." && grunt dist-all

	# after install call
	sudo countly check after install

	#finally start countly api and dashboard
	countly start

	bash "$INSTALL_DIR/scripts/done.sh";
fi
