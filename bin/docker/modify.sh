#!/bin/bash

source /etc/os-release

# Remove plugins unsupported in Docker distribution
rm -rf /opt/countly/plugins/data_migration
rm -rf /opt/countly/plugins/errorlogs
rm -rf /opt/countly/plugins/plugin-upload
rm -rf /opt/countly/plugins/updates

if [ "${COUNTLY_CONTAINER}" != "frontend" ]; then
	# Run ab-testing models compilation if it's there
	if [ -d /opt/countly/plugins/ab-testing ]; then
		if [ "${ID}" == "debian" ]; then
			wget https://www.python.org/ftp/python/3.6.8/Python-3.6.8.tgz
			tar -xvf Python-3.6.8.tgz
			cd Python-3.6.8/
			./configure && make && make install
			cd ../
			rm -rf Python-3.6.8*
			apt-get -y install python3-pip

			python3.6 -m pip install pandas pystan
			cd /opt/countly/plugins/ab-testing/api/bayesian && python3.6 model.py
			python3.6 -m pip uninstall -qy pystan
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

