Name:       countly
Version:    16.12
Release:    1%{?dist}
Summary:    countly
# License text is included in README.md
License:    MIT
Group:      System Environment/Libraries
URL:        https://github.com/countly/countly-server
Source0:    countly.tar.gz
Source1:    countly.init
Requires:   nodejs >= 6
Requires(post): /sbin/chkconfig, /usr/sbin/useradd
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Provides: countly

#BuildRequires:  nodejs

#%if 0%{?fedora} >= 19
#ExclusiveArch: %{nodejs_arches}
#%else
ExclusiveArch: %{ix86} x86_64 %{arm}
#%endif

%description
countly

%prep
%setup -q -c countly

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
node_modules/grunt-cli/bin/grunt dist-all

%install
mkdir -p %{buildroot}/opt/countly
cp -r * %{buildroot}/opt/countly/
mkdir -p %{buildroot}%{_initddir}
cp %{SOURCE1} %{buildroot}%{_initddir}/countly

%post
/sbin/chkconfig --add countly

%files
%attr(755, root, root) %{_initddir}/countly
/opt/countly

%changelog
* Thu Dec 29 2016 Sergey Alembekov <rt@aspirinka.net> - 16.12
- initial build
