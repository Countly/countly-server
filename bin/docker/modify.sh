#!/bin/bash

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
			apt-get -y install gcc g++ build-essential python3-dev python3-pip libncurses*-dev  libsqlite3-dev libreadline6-dev libgdbm-dev zlib1g-dev libbz2-dev sqlite3 tk-dev zip libssl-dev libncurses5-dev python-lzma liblzma-dev tk8.5-dev
			python3 -m pip install pandas pystan
			cd /opt/countly/plugins/ab-testing/api/bayesian && python3 model.py
			python3 -m pip uninstall -qy pystan
			rm -rf ~/.cache
		else
			yum install -y python36 python36-libs python36-devel python36-pip centos-release-scl devtoolset-7-gcc-c++
		    source /opt/rh/devtoolset-7/enable
			export CC=/opt/rh/devtoolset-7/root/usr/bin/gcc
			export CXX=/opt/rh/devtoolset-7/root/usr/bin/g++
			python3 -m pip install pandas pystan
			cd /opt/countly/plugins/ab-testing/api/bayesian && python3 model.py
			python3 -m pip uninstall -qy pystan
			yum remove -y python36-devel centos-release-scl devtoolset-7-gcc-c++ devtoolset-7-gcc devtoolset-7-libstdc++-devel
		fi
	fi
fi

