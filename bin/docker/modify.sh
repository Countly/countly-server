#!/bin/bash

# shellcheck disable=SC1091
source /etc/os-release

# Remove plugins unsupported in Docker distribution
if [ "${COUNTLY_CONTAINER}" != "both" ]; then
	rm -rf /opt/countly/plugins/data_migration
fi
rm -rf /opt/countly/plugins/errorlogs
rm -rf /opt/countly/plugins/plugin-upload
rm -rf /opt/countly/plugins/updates

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" > /etc/timezone
fi

if [ "${COUNTLY_CONTAINER}" != "frontend" ]; then
	# Run ab-testing models compilation if it's there
	if [ -d /opt/countly/plugins/ab-testing ]; then
		if [ "${ID}" == "debian" ] || [ "${ID}" == "ubuntu" ]; then
			apt-get -y install python3-pip
		else
			yum install -y python36 python36-libs python36-devel python36-pip
		fi
		# shellcheck disable=SC1091
		python3.8 -m pip install -r /opt/countly/plugins/ab-testing/api/bayesian/requirements.txt
		cd /opt/countly/plugins/ab-testing/api/bayesian && python3 model.py
	fi

	# install monngodb tools to have mongoexport
	if [ "${ID}" == "debian" ] || [ "${ID}" == "ubuntu" ]; then
	    wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian10-x86_64-100.5.4.deb
            apt install ./mongodb-database-tools-*-100.5.4.deb
	    rm ./mongodb-database-tools-*-100.5.4.deb
	else
            wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-rhel70-x86_64-100.5.4.rpm
            rpm -i  ./mongodb-database-tools-*-100.5.4.rpm
	    rm ./mongodb-database-tools-*-100.5.4.rpm
	fi
fi

