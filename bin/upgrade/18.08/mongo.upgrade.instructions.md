If server runs mongodb 3.4, you can upgrade directly to mongo 3.6
If not, you need to first upgrade to mongo 3.4 and only then to mongo3.6

After upgrading check if everything is working and only then witch to feature compatability version

If you want to automate this process, you can run upgrade.mongo.sh directly to do version checks and upgrade to MongoDB 3.6