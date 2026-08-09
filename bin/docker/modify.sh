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
		AB=/opt/countly/plugins/ab-testing/api/bayesian
		# Docker images precompile models in the ab-models stage; skip when present,
		# disabled, or when only the CE stub (no model sources) is shipped
		if [ -x "$AB/models/stan_models/model_2_variants" ] || [ -f "$AB/.ab_disabled" ] || [ ! -f "$AB/models/cmdstanpy_model.py" ]; then
			echo "AB-testing models already built, disabled or absent, skipping"
		else
			if [ "${ID}" == "debian" ] || [ "${ID}" == "ubuntu" ]; then
				apt-get install -y python3-pip
			else
				yum install -y python38 python38-libs python38-devel python38-pip
			fi
			PY=$(command -v python3.12 || command -v python3.8 || command -v python3)
			# pinned numpy/pandas need >=3.9; fall back to resolver-chosen versions on older pythons
			"$PY" -m pip install -r "$AB/requirements.txt" || "$PY" -m pip install "cmdstanpy==1.2.5"
			# pin CmdStan and install to a path the runtime user can read (not /root)
			# clear any inherited CMDSTAN (centos sets it as ENV) so the compiler installs CmdStan
			cd /opt/countly && CMDSTAN='' CMDSTAN_VERSION=2.36.0 CMDSTAN_DIR=/opt/cmdstan CMDSTAN_BUILD_CORES="$(nproc)" "$PY" "$AB/models/cmdstanpy_model.py" && \
			chmod -R a+rX /opt/cmdstan
		fi
	fi
fi
