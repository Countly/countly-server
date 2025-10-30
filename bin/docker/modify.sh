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
			apt-get install -y python3-pip
			add-apt-repository -y ppa:deadsnakes/ppa
    		apt -y install python3.12 python3.12-dev
    		curl -sSL https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    		python3.12 get-pip.py
		else
	    if ! command -v python3.12 &>/dev/null; then
        # Install Python 3.12 if it's not installed
          cd /tmp/ && wget https://www.python.org/ftp/python/3.12/Python-3.12.0.tgz
          tar -xvf Python-3.12.0.tgz
          cd Python-3.12.0/
          ./configure --enable-optimizations
          make altinstall
          ln -sf /usr/local/bin/python3.12 /usr/bin/python3.12
          else
            echo "Python 3.12 is already installed."
         fi

    sudo curl -sSL https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    sudo python3.12 get-pip.py
		fi
		# shellcheck disable=SC1091
		python3.12 -m pip install -r "/opt/countly/plugins/ab-testing/api/bayesian/requirements.txt" && python3.12 "/opt/countly/plugins/ab-testing/api/bayesian/models/cmdstanpy_model.py"
	fi
fi
