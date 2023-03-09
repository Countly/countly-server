#!/bin/bash

#check if authentication is required
isAuth=0
if grep -Eq '^\s*authorization\s*:\s*enabled' /etc/mongod.conf; then
    isAuth=1
fi

#check if we have previous upgrade needed
FEATVER=$(mongo admin --eval "printjson(db.adminCommand( { getParameter: 1, featureCompatibilityVersion: 1 } ).featureCompatibilityVersion)" --quiet);
VER=$(mongod -version | grep "db version" | cut -d ' ' -f 3 | cut -d 'v' -f 2)

if [ "$isAuth" -eq "1" ]; then
    echo "Since authentication is enabled, we cannot verify if you need to run this upgrade script"
    echo ""
    echo "Please run this command with authentication parameters:"
    echo ""
    echo "mongo admin --eval \"db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 } )\""
    echo ""
    echo "and continue only if \"featureCompatibilityVersion\" is 4.4 "
    echo ""
    read -r -p "Is your \"featureCompatibilityVersion\" version is 4.4? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    then
        echo "Continue upgrading"
    else
        echo "Stopping script"
        exit 0;
    fi

fi

if [ -x "$(command -v mongo)" ]; then
    if echo "$VER" | grep -q -i "5.0" ; then
        if echo "$FEATVER" | grep -q -i "4.4" ; then
            echo "run this command to upgrade to 5.0";
            echo "mongo admin --eval \"db.adminCommand( { setFeatureCompatibilityVersion: \\\"5.0\\\" } )\"";
        else
            echo "We already have version 5.0";
        fi
        exit 0;
    elif echo "$VER" | grep -q -i "4.4" ; then
        echo "Upgrading to MongoDB 5.0";
    else
        echo "Unsupported MongodB version $VER";
        echo "Upgrade to MongoDB 4.4 first and then run this script";
        exit 1;
    fi

    if [ -f /etc/redhat-release ]; then
        #backup of systemd unit file and mongod.conf file
        \cp /usr/lib/systemd/system/mongod.service /usr/lib/systemd/system/mongod.service.bak
        \cp -f /etc/mongod.conf /etc/mongod.conf.bak
        #uninstall mognodb
        yum erase -y mongodb-org mongodb-org-mongos mongodb-org-server mongodb-org-shell mongodb-org-tools
    fi

    if [ -f /etc/lsb-release ]; then
        UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";
        if [ "$UBUNTU_YEAR" == "22" ]; then
            sed -i "s/#\$nrconf{restart} = 'i';/\$nrconf{restart} = 'a';/" /etc/needrestart/needrestart.conf
        fi
        #uninstall mognodb
        apt-get remove -y mongodb-org mongodb-org-mongos mongodb-org-server mongodb-org-shell mongodb-org-tools python3-apt
        apt-get install -y  python3-apt
    fi
fi

if [ -f /etc/redhat-release ]; then
    #install latest mongodb

    #select source based on release
	if grep -q -i "release 6" /etc/redhat-release ; then
        echo "[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc" > /etc/yum.repos.d/mongodb-org-5.0.repo
    elif grep -q -i "release 7" /etc/redhat-release ; then
        echo "[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc" > /etc/yum.repos.d/mongodb-org-5.0.repo
    elif grep -q -i "release 8" /etc/redhat-release ; then
        echo "[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc" > /etc/yum.repos.d/mongodb-org-5.0.repo
    fi
    yum install -y mongodb-org
    \cp -f /etc/mongod.conf.bak /etc/mongod.conf
fi

if [ -f /etc/lsb-release ]; then
    #install latest mongodb
	wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

    if [ "$UBUNTU_YEAR" == "16" ]; then
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
    elif [ "$UBUNTU_YEAR" == "18" ]; then
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
    else
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
    fi
    apt-get update
    #install mongodb
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install mongodb-org --force-yes || (echo "Failed to install mongodb." ; exit)
fi

if [ -f /etc/redhat-release ]; then
    #Restoring systemd unit file
    \cp -f /usr/lib/systemd/system/mongod.service.bak /usr/lib/systemd/system/mongod.service
    systemctl daemon-reload
    #mongodb might need to be started
    if grep -q -i "release 6" /etc/redhat-release ; then
        service mongod restart || echo "mongodb service does not exist"
    else
        systemctl restart mongod || echo "mongodb systemctl job does not exist"
    fi
fi

if [ -f /etc/lsb-release ]; then
    if [[ $(/sbin/init --version) =~ upstart ]]; then
        restart mongod || echo "mongodb upstart job does not exist"
    else
        systemctl restart mongod || echo "mongodb systemctl job does not exist"
    fi
fi
#nc not available on latest centos
#until nc -z localhost 27017; do echo Waiting for MongoDB; sleep 1; done
mongo --nodb --eval 'var conn; print("Waiting for MongoDB connection on port 27017. Exit if incorrect port"); var cnt = 0; while(!conn && cnt <= 300){try{conn = new Mongo("localhost:27017");}catch(Error){}sleep(1000);cnt++;}'

if [ "$isAuth" -eq "1" ]; then
    echo "run this command with authentication to upgrade to 5.0"
    echo "mongo admin --eval \"db.adminCommand( { setFeatureCompatibilityVersion: \\\"5.0\\\" } )\""
elif ! mongo admin --eval "printjson(db.adminCommand( { getParameter: 1, featureCompatibilityVersion: 1 } ))" ; then
    echo "Could not connect to MongodB, run this command when Mongo is up and running"
    echo "mongo admin --eval \"db.adminCommand( { setFeatureCompatibilityVersion: \\\"5.0\\\" } )\""
else
    mongo admin --eval "printjson(db.adminCommand( { getParameter: 1, featureCompatibilityVersion: 1 } ))"
    mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"5.0\" } )"
    echo "Finished upgrading script"
fi