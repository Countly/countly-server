#!/bin/bash

# Refreshes the Python package stack the ab-testing models run on, for an
# existing 25.03 install: pip (which vendors the certifi CA bundle), certifi
# itself, and the plugin's pinned requirements.
#
# Standalone, like upgrade.nodejs.22.sh: not tied to the version gate, so any
# 25.03.x install can run it, and safe to run again, as pip only reinstalls
# what is below the floors. The compiled Stan models do not depend on the
# Python packages and are left as they are; no restart is needed, as every
# model run starts a fresh interpreter.
#
# pip >= 26.2.2 needs python >= 3.10. On a python3.8 install (25.03 before
# 25.03.52) only the certifi package can be refreshed, and the script fails
# at the final check so that the gap is not reported as patched.

PIP_MIN="26.2.2"
CERTIFI_MIN="2026.10.19"

# Ubuntu 24 ships python3.12 as the system interpreter and marks it externally
# managed (PEP 668), which makes pip refuse a system-wide install. setup.sh has
# always installed the plugin's packages system-wide for that interpreter, so
# this refresh does the same; pip >= 23.1 and get-pip.py honour the variable.
export PIP_BREAK_SYSTEM_PACKAGES=1

if [ -f /etc/redhat-release ]; then
    CENTOS_MAJOR="$(awk -F'[^0-9]+' '{ print $2 }' /etc/redhat-release)"

    if [[ "$CENTOS_MAJOR" != "8" && "$CENTOS_MAJOR" != "9" ]]; then
        echo "Unsupported OS version, only support CentOS/RHEL 8 and 9."
        exit 1
    fi
fi

if [ -f /etc/lsb-release ]; then
    UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

    if [[ "$UBUNTU_YEAR" != "20" && "$UBUNTU_YEAR" != "22" && "$UBUNTU_YEAR" != "24" ]]; then
        echo "Unsupported OS version, only support Ubuntu 20, 22 and 24."
        exit 1
    fi
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"
AB="$DIR/plugins/ab-testing/api/bayesian"

if [ ! -d "$AB" ] || [ -f "$AB/.ab_disabled" ]; then
    echo "ab-testing is not installed or is disabled, nothing to upgrade"
    exit 0
fi

# Same lookup order as the plugin's resolvePythonPath, so the interpreter
# refreshed here is the one the models run on
PY="$(command -v python3.12 || command -v python3.8 || command -v python3)"
if [ -z "$PY" ]; then
    echo "No python interpreter found on PATH"
    exit 1
fi
echo "Using $PY ($("$PY" --version 2>&1))"

if ! "$PY" -m pip --version >/dev/null 2>&1; then
    echo "pip is missing for $PY, bootstrapping it"
    curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py && "$PY" /tmp/get-pip.py
    rm -f /tmp/get-pip.py
fi

"$PY" -m pip install --upgrade "pip>=$PIP_MIN" \
    || echo "WARNING: pip could not be upgraded to >= $PIP_MIN on $PY"
"$PY" -m pip install --upgrade "certifi>=$CERTIFI_MIN" || exit 1

if [ -f "$AB/requirements.txt" ]; then
    "$PY" -m pip install -r "$AB/requirements.txt" \
        || echo "WARNING: the pinned requirements did not install on $PY; the models keep their current packages"
fi

"$PY" - "$PIP_MIN" "$CERTIFI_MIN" <<'PYCHECK'
import sys
import pip
import certifi

def parse(version):
    return tuple(int(part) for part in version.split("."))

ok = True
for name, have, want in (("pip", pip.__version__, sys.argv[1]), ("certifi", certifi.__version__, sys.argv[2])):
    state = "ok" if parse(have) >= parse(want) else "BELOW REQUIRED"
    print("%s %s (required >= %s): %s" % (name, have, want, state))
    ok = ok and state == "ok"
sys.exit(0 if ok else 1)
PYCHECK
