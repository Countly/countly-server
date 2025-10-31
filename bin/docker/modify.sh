#!/bin/bash

# shellcheck disable=SC1091
source /etc/os-release

# Remove plugins unsupported in Docker distribution
if [ "${COUNTLY_CONTAINER}" != "both" ]; then
	rm -rf /opt/countly/plugins/data_migration
fi
rm -rf /opt/countly/plugins/errorlogs

if [ ! -f "/etc/timezone" ]; then
    echo "Etc/UTC" > /etc/timezone
fi

if [ "${COUNTLY_CONTAINER}" != "frontend" ]; then
	# Run ab-testing models compilation if it's there
	if [ -d /opt/countly/plugins/ab-testing ]; then
		if [ "${ID}" == "debian" ] || [ "${ID}" == "ubuntu" ]; then
			echo "Debian noninteractive"
            export DEBIAN_FRONTEND=noninteractive
            export TZ=Etc/UTC

           apt-get -y update
           apt-get install -y software-properties-common build-essential python3-dev libncurses*-dev  libsqlite3-dev libreadline6-dev libgdbm-dev zlib1g-dev libbz2-dev sqlite3 tk-dev zip libssl-dev libncurses5-dev liblzma-dev lsb-core lsb-release

           export LC_ALL="en_US.UTF-8"
           export LC_CTYPE="en_US.UTF-8"
           export -n CC
           export -n CXX
           add-apt-repository -y ppa:deadsnakes/ppa
           apt -y install python3.12 python3.12-dev
           curl -sSL https://bootstrap.pypa.io/get-pip.py -o get-pip.py
           python3.12 get-pip.py
		else
			yum install -y python36 python36-libs python36-devel python36-pip
		fi
		# shellcheck disable=SC1091
		python3.12 -m pip install -r "/opt/plugins/ab-testing/api/bayesian/requirements.txt" && sudo python3.12 "/opt/plugins/ab-testing/api/bayesian/models/cmdstanpy_model.py"
	fi
fi
