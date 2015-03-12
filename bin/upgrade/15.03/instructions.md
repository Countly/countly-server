Before upgrading:

Assuming countly is installed at /var/countly
0) Download new countly version 15.03
1) Rename old countly folder to /var/countly.old
2) Put new countly files in /var/countly
3) Back up your database, for example by making copy of it in ssh:
#assuming your countly database is name countly, execute
mongo
use countly 
db.copyDatabase("countly", "countly_backup")

#to verify there is also a backup dbs execute
show dbs 




Upgrading
go to countly directory by typing

cd /var/countly

If you are using countly community edition then type

bash bin/upgrade/15.02/community.upgrade.sh

If you are using countly enterprise edition then type

bash bin/upgrade/15.02/enterprise.upgrade.sh