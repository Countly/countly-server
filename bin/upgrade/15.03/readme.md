
Follow these instructions if you want to upgrade an old version of Countly (<= 14.08) to a new version (>= 15.03.x).

If you are upgrading from 15.03 to 15.03.01 and up, simply copy over files and restart countly-supervisor

##Before upgrading from Countly (<= 14.08) to a new version (>= 15.03.x)
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
2) Back up your existing installation files or at least take note of connection settings in Countly config files

#Upgrading from Countly (<= 14.08) to a new version (>= 15.03.x)

Assuming Countly is installed at /var/countly

1) Download new countly version 15.03.x

2) Unzip package into your Countly directory

3) Run the upgrade script

```
#go to your countly folder
cd /var/countly

#run upgrade script
bash bin/upgrade/15.03/upgrade.sh
```

4) Modify new Countly config files to point to your database (espeically if you use remote DB server or replica set, check from old config files you have backed up)

Files to modify:
```
/var/countly/api/config.sample.js

/var/countly/frontend/express/config.sample.js

#and if you have enterprise edition then also
/var/countly/plugins/drill/config.sample.js
```

5) If you are upgrading from Countly Community Edition also execute community upgrade script

    bash bin/upgrade/15.03/community.upgrade.sh
