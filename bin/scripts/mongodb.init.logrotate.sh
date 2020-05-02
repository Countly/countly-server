#!/bin/bash

function message_optional () {
    echo -e "\e[1m[\e[93m?\e[97m]\e[0m $1"
}

function message_ok () {
    echo -e "\e[1m[\e[92m+\e[97m]\e[0m $1"
}

#add mongod entry for logrotate daemon
if [ -x "$(command -v logrotate)" ]; then
    MONGO_CONFIG_FILE="/etc/mongod.conf"
    INDENT_LEVEL=$(grep dbPath "${MONGO_CONFIG_FILE}" | awk -F"[ ]" '{for(i=1;i<=NF && ($i=="");i++);print i-1}')
    INDENT_STRING=$(printf ' %.0s' $(seq 1 "$INDENT_LEVEL"))
    #delete if any other logRotate directive exist and add logRotate to mongod.conf
    sed -i '/logRotate/d' /etc/mongod.conf
    sed -i "s#systemLog:#systemLog:\n${INDENT_STRING}logRotate: reopen#g" /etc/mongod.conf

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
    fi

    if [ -f /etc/lsb-release ]; then
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
    fi

    if [ -f /etc/redhat-release ]; then
        #mongodb might need to be started
        if grep -q -i "release 6" /etc/redhat-release ; then
            service mongod restart || echo "mongodb service does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    fi

    if [ -f /etc/lsb-release ]; then
        if [[ "$(/sbin/init --version)" =~ upstart ]]; then
            restart mongod || echo "mongodb upstart job does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    fi

    message_ok 'Logrotate configured'
else
    message_optional 'Command logrotate is not found, please install logrotate'
fi