
Follow these instructions if you want to upgrade an old version of Countly (<= 14.08) to a new version (>= 15.03.x).

If you are upgrading from 15.03 to 15.03.01 and up, follow [these instructions](http://resources.count.ly/v1.0/docs/upgrading-countly-server#section-regular-upgrade)

<strong>Before upgrading from Countly (<= 14.08) to a new version (>= 15.03.x)</strong>

Also refer to [Backing up Countly Server](http://resources.count.ly/v1.0/docs/backing-up-countly-server) information

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

<strong>Upgrading from Countly (<= 14.08) to a new version (>= 15.03.x)</strong>

Assuming Countly is installed at /var/countly

1) Download new countly version

2) Rename your existing Countly installation folder to /var/countly.old and create new empty /var/countly folder

3) Copy new files into that 

4) Run bash bin/countly.install.sh script to run the installation

5) Modify new Countly config files to point to your database (espeically if you use remote DB server or replica set, check from old config files you have backed up)

Files to modify:
```
/var/countly/api/config.sample.js

/var/countly/frontend/express/config.sample.js

#and if you have Countly Enterprise then also
/var/countly/plugins/drill/config.sample.js
```

5) Additionally you might need to copy app image files from your old countly frontend/express/public/appimages/ folder

6) If you are upgrading from Countly Lite also execute community upgrade script

    bash bin/upgrade/15.03/community.upgrade.sh
