#! /bin/bash


# Copyright 2017-present: Intoli, LLC
# Source: https://intoli.com/blog/installing-google-chrome-on-centos/
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
# this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following disclaimer in the documentation
# and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.


# What this script does is explained in detail in a blog post located at:
# https://intoli.com/blog/installing-google-chrome-on-centos/
# If you're trying to figure out how things work, then you should visit that!


# Require that this runs as root.
[ "$UID" -eq 0 ] || exec sudo "$0" "$@"


# Define some global variables.
working_directory="/tmp/google-chrome-installation"
if ping -c 1 google.com >> /dev/null 2>&1; then
    dl_google_chrome_stable_url="https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm"
else
    dl_google_chrome_stable_url="http://countly-1252600587.cos.ap-guangzhou.myqcloud.com/google-chrome-stable_current_x86_64.rpm"
fi


# Work in our working directory.
echo "Working in ${working_directory}"
mkdir -p ${working_directory}
rm -rf ${working_directory:?}/*
pushd ${working_directory}


# A helper to make sure that Chrome is linked correctly
function installation_status() {
    google-chrome-stable --version > /dev/null 2>&1
    #[ $? -eq 0 ]
}


# Uninstall any existing/partially installed versions.
yum --setopt=tsflags=noscripts -y remove google-chrome-stable


# Get latest RPM.
yum install -y wget
echo "Downloading the Google Chrome RPM file."
wget ${dl_google_chrome_stable_url}
rpm_file=$(echo ./*.rpm)
echo "Downloaded ${rpm_file}"


# Install the RPM in a broken state.
rpm -ih --nodeps "${rpm_file}"
rm "${rpm_file}"


# Install font dependencies, see: https://bugs.chromium.org/p/chromium/issues/detail?id=782161
echo "Installing the required font dependencies."
yum install -y \
    fontconfig \
    fontpackages-filesystem \
    ipa-gothic-fonts \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils


# Helper function to install packages in the chroot by name (as an argument).
function install_package() {
    # We'll leave the RPMs around to avoid redownloading things.
    if [ -f "$1.rpm" ]; then
        return 0
    fi

    # Find the URL for the package.
    url=$(repoquery --repofrompath="centos7,http://mirror.centos.org/centos/7/os/$(arch)" \
        --repoid=centos7 -q --qf="%{location}" "$1" | \
        sed "s/x86_64.rpm$/$(arch).rpm/" | \
        sed "s/i686.rpm$/$(arch).rpm/g" | \
        sort -u
    )

    # Download the RPM.
    wget "${url}" -O "$1.rpm"

    # Extract it.
    echo "Extracting $1..."
    rpm2cpio "$1.rpm" | cpio -idmv > /dev/null 2>&1
}


# Install glibc/ld-linux from CentOS 7.
install_package glibc


# Make the library directory and copy over glibc/ld-linux.
lib_directory=/opt/google/chrome/lib
mkdir -p "$lib_directory"
cp ./lib/* "$lib_directory/" 2> /dev/null
cp ./lib64/* "$lib_directory/" 2> /dev/null


# Install `mount` and its mandatory dependencies from CentOS 7.
for package in "glibc" "util-linux" "libmount" "libblkid" "libuuid" "libselinux" "pcre"; do
    install_package "${package}"
done


# Create an `ldd.sh` script to mimic the behavior of `ldd` within the namespace (without bash, etc. dependencies).
{
echo '#!/bin/bash'
echo ''
echo '# Usage: ldd.sh LIBRARY_PATH EXECUTABLE'
echo 'mount --make-rprivate /'
# shellcheck disable=SC2016
echo 'unshare -m bash -c "`tail -n +7 $0`" "$0" "$@"'
echo 'exit $?'
echo ''
# shellcheck disable=SC2016
echo 'LD=$({ ls -1 ${1}/ld-linux* | head -n1 ; } 2> /dev/null)'
echo 'mount --make-private -o remount /'
# shellcheck disable=SC2016
echo 'mount --bind ${1} $(dirname "$({ ls -1 /lib/ld-linux* /lib64/ld-linux* | head -n1 ; } 2> /dev/null)")'
echo 'for directory in lib lib64 usr/lib usr/lib64; do'
# shellcheck disable=SC2016
echo '    PATH=./:./bin:./usr/bin LD_LIBRARY_PATH=${1}:./lib64:./usr/lib64:./lib:./usr/lib mount --bind ${1} /${directory} 2> /dev/null'
echo 'done'
# shellcheck disable=SC2016
echo 'echo -n "$(LD_TRACE_LOADED_OBJECTS=1 LD_LIBRARY_PATH="${1}" "${LD}" "${2}")"'
} >> ldd.sh
chmod a+x ldd.sh


# Takes the executable as an argument and recursively installs all missing dependencies.
function install_missing_dependencies() {
    executable="${1}"
    # Loop through and install missing dependencies.
    while true; do
        finished=true
        # Loop through each of the missing libraries for this round.
        while read -r line; do
            # Parse the various library listing formats.
            if [[ "$line" == *"/"* ]]; then
                # Extract the filename when a path is present (e.g. /lib64/).
                # shellcheck disable=SC2001
                file=$(echo "$line" | sed 's>.*/\([^/:]*\):.*>\1>')
            else
                # Extract the filename for missing libraries without a path.
                file=$(echo "$line" | awk '{print $1}')
            fi

            if [ -z "$file" ]; then
                continue
            fi

            # We'll require an empty round before completing.
            finished=false

            echo "Finding dependency for ${file}"

            # Find the package name for this library.
            package=$(repoquery --repofrompath="centos7,http://mirror.centos.org/centos/7/os/$(arch)" \
                --repoid=centos7 -q --qf="%{name}" --whatprovides "$file" | head -n 1)

            install_package "${package}"

            # Copy it over to our library directory.
            find . | grep "/${file}" | xargs -n1 -I{} cp {} ${lib_directory}/
        done <<< "$(./ldd.sh "${lib_directory}" "${executable}" 2>&1 | grep -e "no version information" -e "not found")"

        # Break once no new files have been copied in a loop.
        if [ "$finished" = true ]; then
            break
        fi
    done
}


# Install the missing dependencies for Chrome.
install_missing_dependencies /opt/google/chrome/chrome


if ! installation_status; then
    # Time for the big guns, we'll try to patch the executables to use our lib directory.
    yum install -y gcc gcc-c++ make autoconf automake
    echo "Linking issues were encountered, attempting to patch the Chrome executable."
    wget https://github.com/NixOS/patchelf/archive/0.9.tar.gz -O 0.9.tar.gz
    tar zxf 0.9.tar.gz
    pushd patchelf-0.9
    ./bootstrap.sh
    ./configure
    make
    # shellcheck disable=SC2012
    LD="$({ ls -1 ${lib_directory}/ld-linux* | head -n1 ; } 2> /dev/null)"
    ./src/patchelf --set-interpreter "${LD}" --set-rpath "${lib_directory}" /opt/google/chrome/chrome
    ./src/patchelf --set-interpreter "${LD}" --set-rpath "${lib_directory}" /opt/google/chrome/chrome-sandbox
    sed -i 's/\(.*exec cat.*\)/LD_LIBRARY_PATH="" \1/g' /opt/google/chrome/google-chrome
    popd > /dev/null
    echo "Attempted experimental patching of Chrome to use a relocated glibc version."
fi

# Clean up the directory stack.
rm -rf ${working_directory}
popd > /dev/null

# Print out the success status message and exit.

if version="$(google-chrome-stable --version)"; then
    echo "Successfully installed google-chrome-stable, ${version}."
    exit 0
else
    echo "Installation has failed."
    echo "Please email contact@intoli.com with the details of your operating system."
    echo "If you're using using AWS, please include the AMI identifier for the instance."
    exit 1
fi
