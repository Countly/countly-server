#!/bin/bash

# Refreshes the Python package stack the ab-testing models run on, for an
# existing 25.03 install: pip (which vendors the certifi CA bundle), certifi
# itself, and the plugin's pinned requirements. On Ubuntu it also disables the
# distrusted emSign roots in the OS CA store, whether ab-testing is installed
# or not.
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
# pip's warning about running as root is noise here: this runs as root on purpose
export PIP_ROOT_USER_ACTION=ignore

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

# The distro pip uses the OS CA store rather than a bundle of its own, as do
# curl, apt and python's default SSL context, and Ubuntu had not dropped the
# distrusted emSign roots yet. Disables the ones certifi 2026.10.19 dropped (G1
# stays trusted, as in certifi). Ubuntu keeps "!" lines across ca-certificates
# upgrades. Runs before the ab-testing check, as the store serves the whole host.
EMSIGN_DISTRUSTED="emSign_Root_CA_-_C1 emSign_ECC_Root_CA_-_C3 emSign_ECC_Root_CA_-_G3"
CA_OK=1
if [ -f /etc/ca-certificates.conf ] && command -v update-ca-certificates >/dev/null 2>&1; then
    CA_CHANGED=0
    for c in $EMSIGN_DISTRUSTED; do
        if grep -qx "mozilla/$c.crt" /etc/ca-certificates.conf; then
            if [ "$CA_CHANGED" = "0" ]; then
                cp -p /etc/ca-certificates.conf "/etc/ca-certificates.conf.bak-$(date '+%Y%m%d-%H%M%S')"
            fi
            sed -i "s|^mozilla/$c.crt$|!&|" /etc/ca-certificates.conf
            echo "Disabling $c in the OS CA store"
            CA_CHANGED=1
        fi
    done
    if [ "$CA_CHANGED" = "1" ]; then
        update-ca-certificates
    fi
    for c in $EMSIGN_DISTRUSTED; do
        if [ -e "/etc/ssl/certs/$c.pem" ]; then
            echo "OS CA store: $c is still trusted"
            CA_OK=0
        fi
    done
    if [ "$CA_OK" = "1" ]; then
        echo "OS CA store: distrusted emSign roots are not trusted"
    fi
elif [ -f /etc/redhat-release ]; then
    echo "NOTE: the OS CA store is not changed on CentOS/RHEL, check the emSign roots with: trust list | grep -A2 -i emsign"
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

# Upgrades pip for $1 to >= $PIP_MIN, whoever installed it, so that a single
# up-to-date pip is the one used:
#  - not installed                -> get-pip.py
#  - installed by pip/get-pip     -> upgraded in place
#  - apt/rpm package, unused      -> package removed, then get-pip.py (one copy left)
#  - apt/rpm package, depended on -> installed alongside in /usr/local, which
#    comes before the package's copy on sys.path and PATH
# The generic pip/pip3 commands are kept as they were unless $1 is the system
# python3, so a python3.12 next to a python3.10 does not take over "pip3".
upgrade_pip() {
    local py="$1" pip_dir pkg="" mgr="" rc backup b

    get_pip() {
        curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py \
            && "$py" /tmp/get-pip.py "pip>=$PIP_MIN"
        rc=$?
        rm -f /tmp/get-pip.py
        return $rc
    }

    # remember the generic commands, to put them back if they belong elsewhere
    backup="$(mktemp -d)"
    for b in pip pip3; do
        [ -f "/usr/local/bin/$b" ] && cp -p "/usr/local/bin/$b" "$backup/"
    done

    if ! "$py" -m pip --version >/dev/null 2>&1; then
        echo "pip is missing for $py, bootstrapping it"
        get_pip; rc=$?
    else
        pip_dir="$("$py" -c 'import os, pip; print(os.path.dirname(pip.__file__))')"
        if command -v dpkg >/dev/null 2>&1 && dpkg -S "$pip_dir" >/dev/null 2>&1; then
            mgr=apt
            pkg="$(dpkg -S "$pip_dir" 2>/dev/null | head -1 | cut -d: -f1)"
        elif command -v rpm >/dev/null 2>&1 && rpm -qf "$pip_dir" >/dev/null 2>&1; then
            mgr=rpm
            pkg="$(rpm -qf --qf '%{NAME}' "$pip_dir")"
        fi

        if [ -z "$pkg" ]; then
            echo "pip in $pip_dir was installed by pip, upgrading it in place"
            "$py" -m pip install --upgrade "pip>=$PIP_MIN"; rc=$?
        elif [ "$mgr" = "apt" ] && [ -z "$(apt-cache rdepends --installed "$pkg" | tail -n +3)" ]; then
            echo "pip in $pip_dir is apt package $pkg and nothing depends on it, replacing it"
            DEBIAN_FRONTEND=noninteractive apt-get remove -y "$pkg" && get_pip; rc=$?
        elif [ "$mgr" = "rpm" ] && ! rpm -q --whatrequires "$pkg" >/dev/null 2>&1; then
            echo "pip in $pip_dir is rpm package $pkg and nothing depends on it, replacing it"
            dnf remove -y "$pkg" && get_pip; rc=$?
        else
            echo "pip in $pip_dir is $mgr package $pkg and is depended on, installing alongside it"
            "$py" -m pip install --upgrade --ignore-installed "pip>=$PIP_MIN"; rc=$?
        fi
    fi

    # only the system python3 may own the generic pip/pip3 commands
    if [ "$(readlink -f "$py")" != "$(readlink -f "$(command -v python3)")" ]; then
        for b in pip pip3; do
            if [ -f "$backup/$b" ]; then
                cp -p "$backup/$b" "/usr/local/bin/$b"
            else
                rm -f "/usr/local/bin/$b"
            fi
        done
    fi
    rm -rf "$backup"
    return $rc
}

upgrade_pip "$PY" || echo "WARNING: pip could not be upgraded to >= $PIP_MIN on $PY"

# A distro certifi (Debian/Ubuntu point it at the OS CA store) stays for the
# distro's own tools: pip would delete its files without telling dpkg/rpm. The
# newer one goes alongside in /usr/local, which comes first on sys.path.
CERTIFI_DIR="$("$PY" -c 'import os, certifi; print(os.path.dirname(certifi.__file__))' 2>/dev/null)"
CERTIFI_ARGS=""
if [ -n "$CERTIFI_DIR" ] && { dpkg -S "$CERTIFI_DIR" || rpm -qf "$CERTIFI_DIR"; } >/dev/null 2>&1; then
    echo "certifi in $CERTIFI_DIR belongs to a distro package, installing certifi >= $CERTIFI_MIN alongside it"
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
