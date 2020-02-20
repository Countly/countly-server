#!/bin/bash

#add mongod entry for logrotate daemon
if [ -x "$(command -v logrotate)" ]; then
    #delete if any other logRotate directive exist and add logRotate to mongod.conf
    sed -i '/logRotate/d' /etc/mongod.conf
    sed -i 's#systemLog:#systemLog:\n    logRotate: "reopen"#g' /etc/mongod.conf

    if [ -f /etc/redhat-release ]; then
        cat <<'EOF' >> /etc/logrotate.d/mongod
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
        cat <<'EOF' >> /etc/logrotate.d/mongod
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
else
        echo 'Command logrotate is not found, continuing without logrotate setup.'
fi