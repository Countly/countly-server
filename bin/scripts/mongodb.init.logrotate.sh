#!/bin/bash

if [ ! -z "$1" -a -d "$(dirname "$1")" -a "$(basename "$1")" = "mongod.conf" ]; then
	MONGOD_CONF="$1"
else
	MONGOD_CONF=/etc/mongod.conf
fi

#add mongod entry for logrotate daemon
if [ -x "$(command -v logrotate)" ]; then
    INDENT_LEVEL=$(cat $MONGOD_CONF | grep dbPath | awk -F"[ ]" '{for(i=1;i<=NF && ($i=="");i++);print i-1}')
    INDENT_STRING=$(printf ' %.0s' $(seq 1 $INDENT_LEVEL))
    #delete if any other logRotate directive exist and add logRotate to mongod.conf
    if [ -x /usr/local/bin/brew -a -x /usr/local/sbin/logrotate ]; then
	    sed -i '' -e '/logRotate/d' $MONGOD_CONF
	    sed -i '' -e 's#systemLog:#systemLog:\n'"${INDENT_STRING}"'logRotate: reopen#g' $MONGOD_CONF
    else
	    sed -i '/logRotate/d' $MONGOD_CONF
	    sed -i "s#systemLog:#systemLog:\n${INDENT_STRING}logRotate: reopen#g" $MONGOD_CONF
	fi

    if [ -f /etc/redhat-release ]; then
        cat <<'EOF' > /etc/logrotate.d/mongod
/var/log/mongodb/mongod.log {
  daily
  size 100M
  rotate 5
  missingok
  notifempty
  create 0600 mongod mongod
  sharedscripts
  postrotate
    /bin/kill -SIGUSR1 $(cat /var/lib/mongo/mongod.lock)
  endscript
}
EOF
    elif [ -f /etc/lsb-release ]; then
        cat <<'EOF' > /etc/logrotate.d/mongod
/var/log/mongodb/mongod.log {
  daily
  size 100M
  rotate 5
  missingok
  notifempty
  create 0600 mongodb mongodb
  sharedscripts
  postrotate
    /bin/kill -SIGUSR1 $(cat /var/lib/mongodb/mongod.lock)
  endscript
}
EOF
	elif [ -x /usr/local/bin/brew ]; then
        cat <<'EOF' > /usr/local/etc/logrotate.d/mongod
/usr/local/var/log/mongodb@3.6/mongod.log {
  daily
  size 100M
  rotate 5
  missingok
  notifempty
  create 0600 _mongo admin
  sharedscripts
  postrotate
    /bin/kill -SIGUSR1 $(cat /usr/local/var/mongodb@3.6/mongod.lock)
  endscript
}
EOF

    fi

    if [ -f /etc/redhat-release ]; then
        #mongodb might need to be started
        if grep -q -i "release 6" /etc/redhat-release ; then
            service mongod restart || echo "mongodb service does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    elif [ -f /etc/lsb-release ]; then
        if [[ "$(/sbin/init --version)" =~ upstart ]]; then
            restart mongod || echo "mongodb upstart job does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    elif [ -x /usr/local/bin/brew ]; then
    	sudo brew services restart mongodb/brew/mongodb-community@3.6
    fi
else
        echo 'Command logrotate is not found, continuing without logrotate setup.'
fi