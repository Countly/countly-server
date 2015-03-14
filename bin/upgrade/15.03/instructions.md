#Before upgrading:
Assuming countly is installed at /var/countly

1) Back up your database, for example by making copy of it in ssh:

```
mongo
use countly 
db.copyDatabase("countly", "countly_backup")

#and if you have drill db
db.copyDatabase("countly_drill", "countly_drill_backup")

#to verify backups where created execute
show dbs 
```
2) Back up your existing installation by renaming your old countly folder to /var/countly.old

#Upgrading

Assuming countly is installed at /var/countly

1) Download new countly version 15.03

2) Put new countly files in /var/countly

3) Modify countly config files to point to your database (if you use remote DB server or replica set)
```
/var/countly/api/config.sample.js

/var/countly/frontend/express/config.sample.js

#and if you have enterprise edition then also
/var/countly/plugins/drill/config.sample.js
```

4) Run the installation by doing

```
#go to your countly folder
cd /var/countly

#run installation script
bash bin/countly.install.sh
```

5) If you are upgrading from Countly Community Edition also execute upgrade script

    bash bin/upgrade/15.03/community.upgrade.sh
