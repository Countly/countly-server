#%global enable_tests 0

Name:       countly
Version:    16.06
Release:    1%{?dist}
Summary:    countly
# License text is included in README.md
License:    MIT
Group:      System Environment/Libraries
URL:        https://github.com/countly/countly-server
Source0:    countly.tar.gz

#BuildRequires:  nodejs-devel
#BuildRequires:  node-gyp

#%if 0%{?enable_tests}
#BuildRequires:  npm(generic-pool)
#%endif

#%if 0%{?fedora} >= 19
#ExclusiveArch: %{nodejs_arches}
#%else
ExclusiveArch: %{ix86} x86_64 %{arm}
#%endif

%description
countly

%prep
%setup -q -c countly
#%setup -T -D -a 1 -q -n package
#%nodejs_fixdep generic-pool '~2.0.2'


%build
export CXXFLAGS="%{optflags}"
cp frontend/express/public/javascripts/countly/countly.config.sample.js frontend/express/public/javascripts/countly/countly.config.js
cp api/config.sample.js api/config.js
cp frontend/express/config.sample.js frontend/express/config.js
cp plugins/plugins.default.json plugins/plugins.json
source /opt/rh/devtoolset-2/enable
npm install
pushd plugins/push/api/parts/apn
/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp rebuild
popd
node bin/scripts/install_plugins

%install
mkdir -p %{buildroot}/opt/countly
cp -r * %{buildroot}/opt/countly/

#cp -pr package.json lib/ wscript \
#    %{buildroot}%{nodejs_sitelib}/pg
#mkdir -p %{buildroot}%{nodejs_sitelib}/pg/build
# The following is usually named "<modulename>.node" but for some
# reason upstream have chosen a different naming scheme.
#cp -p build/Release/binding.node \
#    %{buildroot}%{nodejs_sitelib}/pg/build

#%nodejs_symlink_deps


# https://github.com/brianc/node-postgres/wiki/Testing
#%if 0%{?enable_tests}
#%check
#%nodejs_symlink_deps --check
#chmod 700 pgsql pgsql/data
#pwd=$(pwd)
#pg_ctl start -D "${pwd}"/pgsql/data/ -s -o "-p 5432 -k /tmp" -w -t 300
#%__nodejs script/create-test-tables.js pg://test@localhost:5432/test
#make test-unit
#make test-integration connectionString=pg://test@localhost:5432/test
## Not sure yet why this test hangs so comment out for now.
## make test-native connectionString=pg://test@localhost:5432/test
#make test-binary connectionString=pg://test@localhost:5432/test
#pg_ctl stop -D "${pwd}"/pgsql/data/ -s -m fast
#%endif


%files
/opt/countly

%changelog
* Thu Dec 29 2016 Sergey Alembeko <rt@aspirinka.net> - 16.06
- initial build
