#!/bin/bash

echo "Running filesystem modifications"

VER="20.04"

# Prior to 20.04, countly check doesn't exist.
OLDVERSION=($(countly version | tr '.' "\n"))
COUNTLY_CHECK_VERSION=(20 04)
CONTINUE=""
IDX=0
while [ -z "$CONTINUE" -a $IDX -lt ${#OLDVERSION[*]} -a $IDX -lt ${#COUNTLY_CHECK_VERSION[*]} ];
do
	if [ ${OLDVERSION[$IDX]} -lt ${COUNTLY_CHECK_VERSION[$IDX]} ]
	then
		# The old version is older than the first version supporting 'countly check' - continue.
		CONTINUE="1"
	else
		(( IDX += 1 ))
	fi
done
if [ -z "$CONTINUE" ]
then
	CONTINUE="$(countly check before upgrade fs "$VER")"
else
	CONTINUE="1"
fi
if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    #upgrade nodejs
    USING_NODEENV=N
    if [ -x /sbin/launchd -a -x /bin/launchctl ]; then
        # On launchd systems (macOS) use nodejs.
        if [ -n "$(type -t "deactivate_node")" ] && [ "$(type -t "deactivate_node")" = function ]; then
            deactivate_node
        fi
        NODEENVDIR="$( cd "$DIR"/../.nodeenv && pwd )"
        # Use the latest version 10 of nodejs
        LATESTVERSION="$(nodeenv -l 2>&1 | tr -s "\t" "\n" | egrep '^10\..+' | tail -1)"
        sudo rm -rf "$DIR/../.nodeenv"
        nodeenv -n "$LATESTVERSION" "$DIR/../.nodeenv"
        # Fix a bug in nodeenv/shim where it's using a relative directory for node
        mv "$NODEENVDIR/bin/shim" "$NODEENVDIR/bin/shim.saved"
        sed -E -e 's,^exec \.nodeenv/bin/node "\$@"$,exec '"$NODEENVDIR"'/bin/node "$@",' < "$NODEENVDIR/bin/shim.saved" >"$NODEENVDIR/bin/shim"
        chmod a+x "$NODEENVDIR"/bin/shim
        # Activate our nodeenv (and fix DIR, since nodeenv trashes it...)
        source "$DIR/../.nodeenv/bin/activate"
        DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
        USING_NODEENV=Y
    elif [ -f /etc/redhat-release ]; then
        curl -sL https://rpm.nodesource.com/setup_10.x | bash -
        yum clean all
        yum remove -y nodejs
        yum install -y nodejs
    elif [ -f /etc/lsb-release ]; then
        sudo dpkg --configure -a
        wget -qO- https://deb.nodesource.com/setup_10.x | bash -
        apt-get -f -y install
        apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
    fi
    
    #enable command line
    bash "$DIR/scripts/detect.init.sh"

    #remove predefined locale file, it should fallback to default one
    rm -rf "$DIR/../frontend/express/public/localization/min/locale_en.properties"

    #remove previous dependencies, as they need to be rebuild for new nodejs version
    sudo rm -rf "$DIR/../node_modules"
    
    #remove previous package-lock.json
    rm -rf "$DIR/../package-lock.json"

    #run upgrade scripts
    bash "$CUR/scripts/remove_moved_files.sh"
    bash "$CUR/../19.08/scripts/remove_chrome_cache.sh"

    #upgrade plugins
    if [ "$USING_NODEENV" = "Y" ]; then
	    (cd "$DIR/.." && npm install --unsafe-perm)
		(cd "$DIR/.." && npm install argon2 --build-from-source)
    else
	    (cd "$DIR/.." && sudo npm install --unsafe-perm)
		GLIBC_VERSION=$(ldd --version | head -n 1 | rev | cut -d ' ' -f 1 | rev)
		if [[ "$GLIBC_VERSION" != "2.25" ]]; then
			(cd "$DIR/.." && sudo npm install argon2 --build-from-source)
		fi
	fi
    bash countly plugin upgrade push
    (cd "$DIR/../plugins/push/api/parts/apn" && npm install --unsafe-perm)
    bash countly plugin upgrade attribution
    bash countly plugin upgrade web
    bash countly plugin enable active_users
    bash countly plugin enable performance-monitoring
    
    #get web sdk
    bash countly update sdk-web
    
    #install dependencies, process files and restart countly
    bash countly task dist-all

    #call after check
    bash countly check after upgrade fs "$VER"
fi
