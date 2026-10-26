#!/bin/bash

# Refreshes the Python package stack the ab-testing models run on, for an
# existing 24.05 install: pip (which vendors the certifi CA bundle), certifi
# itself, and the plugin's pinned requirements. It also limits the OS CA store
# to the emSign root certifi keeps (G1), whether ab-testing is installed or not.
#
# Standalone, like upgrade.nodejs.22.sh: not tied to the version gate, so any
# 24.05.x install can run it, and safe to run again, as pip only reinstalls
# what is below the floors. The compiled Stan models do not depend on the
# Python packages and are left as they are; no restart is needed, as every
# model run starts a fresh interpreter.
#
# pip >= 26.2.2 needs python >= 3.10. On a python3.8 install (24.05.54 and
# earlier) only the certifi package can be refreshed, and the script fails
# at the final check so that the gap is not reported as patched.

PIP_MIN="26.2.2"
CERTIFI_MIN="2026.10.19"

# Ubuntu 24 ships python3.12 as the system interpreter and marks it externally
# managed (PEP 668), which makes pip refuse a system-wide install. setup.sh has
# always installed the plugin's packages system-wide for that interpreter, so
# this refresh does the same; pip >= 23.1 and get-pip.py honour the variable.
export PIP_BREAK_SYSTEM_PACKAGES=1
export PIP_ROOT_USER_ACTION=ignore
export DEBIAN_FRONTEND=noninteractive
# runs as root; setup.sh shares upgrade_pip below and runs it through sudo
SUDO_PIP=""

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

# The distro pip, curl, apt/dnf and python's default SSL use the OS CA store,
# which still trusts emSign roots that certifi dropped; only G1 is kept.
CA_LEFT=""
if [ -f /etc/ca-certificates.conf ]; then
    # Debian/Ubuntu: a "!" line disables a root, and survives ca-certificates upgrades
    if grep -E '^mozilla/emSign.*\.crt$' /etc/ca-certificates.conf | grep -qvx 'mozilla/emSign_Root_CA_-_G1.crt'; then
        cp -p /etc/ca-certificates.conf "/etc/ca-certificates.conf.bak-$(date '+%Y%m%d-%H%M%S')"
        sed -i '/^mozilla\/emSign.*\.crt$/{/emSign_Root_CA_-_G1.crt$/!s/^/!/}' /etc/ca-certificates.conf
        update-ca-certificates
    fi
    CA_LEFT="$(find /etc/ssl/certs -maxdepth 1 -name 'emSign*.pem' ! -name 'emSign_Root_CA_-_G1.pem' -printf '%f\n')"
elif [ -f /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem ]; then
    # CentOS/RHEL: a root copied into source/blocklist (blacklist on 8) is distrusted
    CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
    CA_BLOCK=/etc/pki/ca-trust/source/blocklist
    [ -d "$CA_BLOCK" ] || CA_BLOCK=/etc/pki/ca-trust/source/blacklist
    if sed -n 's/^# //p' "$CA_BUNDLE" | grep '^emSign' | grep -qvx 'emSign Root CA - G1'; then
        awk -v dir="$CA_BLOCK" '
            /^# / { label = substr($0, 3) }
            /BEGIN CERTIFICATE/ { keep = (label ~ /^emSign/ && label != "emSign Root CA - G1"); file = dir "/" label ".pem"; gsub(/ /, "_", file) }
            keep { print > file }
            /END CERTIFICATE/ { keep = 0 }' "$CA_BUNDLE"
        update-ca-trust extract
    fi
    CA_LEFT="$(sed -n 's/^# //p' "$CA_BUNDLE" | grep '^emSign' | grep -vx 'emSign Root CA - G1')"
fi
CA_OK=1
if [ -n "$CA_LEFT" ]; then
    echo "OS CA store still trusts: ${CA_LEFT//$'\n'/, }"
    CA_OK=0
else
    echo "OS CA store: only emSign Root CA - G1 is trusted, as in certifi"
fi

if [ ! -d "$AB" ] || [ -f "$AB/.ab_disabled" ]; then
    echo "ab-testing is not installed or is disabled, nothing to upgrade"
    [ "$CA_OK" = "1" ]
    exit
fi

# Same lookup order as the plugin's resolvePythonPath, so the interpreter
# refreshed here is the one the models run on
PY="$(command -v python3.12 || command -v python3.8 || command -v python3)"
if [ -z "$PY" ]; then
    echo "No python interpreter found on PATH"
    exit 1
fi
echo "Using $PY ($("$PY" --version 2>&1))"

# pip >= $PIP_MIN for python $1 without breaking a distro (apt/rpm) pip: that one
# is replaced only for the system python3 when nothing depends on it, and put
# back if the new pip fails; otherwise the new pip goes alongside it in
# /usr/local. python < 3.10 is left alone, and pip/pip3 stay with python3.
upgrade_pip() {
    local py pip_dir pkg="" deps removed="" system=0 rc backup pm=apt-get
    py="$(command -v "$1")"
    command -v apt-get >/dev/null 2>&1 || pm=dnf
    if ! "$py" -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then
        echo "pip >= $PIP_MIN needs python >= 3.10, leaving the pip of $py as it is"
        return 1
    fi
    [ "$(readlink -f "$py")" != "$(readlink -f "$(command -v python3)")" ] || system=1
    pip_dir="$("$py" -c 'import os, pip; print(os.path.dirname(pip.__file__))' 2>/dev/null)" || pip_dir=""
    if [ -n "$pip_dir" ]; then
        pkg="$(dpkg -S "$pip_dir" 2>/dev/null | head -1 | cut -d: -f1)"
        [ -n "$pkg" ] || pkg="$(rpm -qf --qf '%{NAME}' "$pip_dir" 2>/dev/null)" || pkg=""
    fi
    backup="$(mktemp -d)"
    cp -p /usr/local/bin/pip /usr/local/bin/pip3 "$backup/" 2>/dev/null || true

    if [ -z "$pkg" ] && "$py" -m pip --version >/dev/null 2>&1; then
        echo "pip in $pip_dir was installed by pip, upgrading it in place"
        $SUDO_PIP "$py" -m pip install --upgrade --no-warn-script-location "pip>=$PIP_MIN"; rc=$?
    else
        deps="$(apt-cache rdepends --installed "$pkg" 2>/dev/null | tail -n +3; rpm -q --whatrequires "$pkg" 2>/dev/null | grep -v '^no package')"
        if [ -z "$pkg" ]; then
            echo "pip is missing for $py, installing it"
        elif [ "$system" = "1" ] && [ -z "$deps" ] && $SUDO_PIP $pm remove -y "$pkg"; then
            echo "removed distro package $pkg, nothing depended on it, replacing it"
            removed="$pkg"
        else
            echo "pip in $pip_dir is distro package $pkg, installing alongside it"
        fi
        # --ignore-installed: never uninstall a distro pip, it can be shared with another python
        curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py \
            && $SUDO_PIP "$py" /tmp/get-pip.py --ignore-installed --no-warn-script-location "pip>=$PIP_MIN"
        rc=$?
        rm -f /tmp/get-pip.py
        if [ "$rc" != "0" ] && [ -n "$removed" ]; then
            echo "WARNING: the new pip failed, reinstalling $removed"
            $SUDO_PIP $pm install -y "$removed"
        fi
    fi

    if [ "$system" = "0" ]; then
        sudo -n rm -f /usr/local/bin/pip /usr/local/bin/pip3
        sudo -n cp -p "$backup"/* /usr/local/bin/ 2>/dev/null || true
    fi
    rm -rf "$backup"
    return $rc
}

upgrade_pip "$PY" || echo "WARNING: pip could not be upgraded to >= $PIP_MIN on $PY"

# a distro certifi is kept (pip would delete its files without telling apt/rpm)
# and the new one installed alongside it
CERTIFI_DIR="$("$PY" -c 'import os, certifi; print(os.path.dirname(certifi.__file__))' 2>/dev/null)"
CERTIFI_ARGS=""
if [ -n "$CERTIFI_DIR" ] && { dpkg -S "$CERTIFI_DIR" || rpm -qf "$CERTIFI_DIR"; } >/dev/null 2>&1; then
    CERTIFI_ARGS="--ignore-installed"
fi
"$PY" -m pip install --upgrade $CERTIFI_ARGS "certifi>=$CERTIFI_MIN" || exit 1

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
PY_OK=$?

[ "$PY_OK" = "0" ] && [ "$CA_OK" = "1" ]
