Name:       countly
Version:    17.04
Release:    1%{?dist}

License:    Modified AGPLv3
Group:	    Applications/Internet
URL:        https://github.com/countly/countly-server
Vendor:     Countly
Source0:    countly-%{version}.tar.gz
Source1:    countly.init
Source2:    countly-api.service
Source3:    countly-dashboard.service
Patch0:	    centos6.patch
Packager:   Sergey Alembekov (sa@count.ly)
Summary:    Countly mobile, web and desktop analytics & marketing platform.

Requires:   nodejs >= 6
Requires(post): /sbin/chkconfig, /usr/sbin/useradd
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Provides: countly
#BuildRequires:  nodejs
%if 0%{?rhel} == 7
BuildRequires:     systemd
Requires(post):    systemd
Requires(preun):   systemd
Requires(postun):  systemd
%endif

AutoReqProv: no

#%if 0%{?fedora} >= 19
#ExclusiveArch: %{nodejs_arches}
#%else
ExclusiveArch: %{ix86} x86_64 %{arm}
#%endif

%description
Countly is an open source, enterprise-grade mobile analytics platform.
It has analytics, marketing, crash & error reporting (web+mobile) and
other features. Countly collects data from mobile phones, tablets,
Apple Watch and other internet-connected devices, and visualizes this
information to analyze mobile application usage and end-user behavior.
This package includes complete Countly Community Edition.

%prep
%setup -q -c countly
%if 0%{?rhel} == 6
%patch0 -p1
%endif

%build
export CXXFLAGS="%{optflags}"
cp frontend/express/public/javascripts/countly/countly.config.sample.js frontend/express/public/javascripts/countly/countly.config.js
cp api/config.sample.js api/config.js
cp frontend/express/config.sample.js frontend/express/config.js
cp plugins/plugins.default.json plugins/plugins.json

%if 0%{?rhel} == 6
source /opt/rh/devtoolset-2/enable
%endif

npm install
pushd plugins/push/api/parts/apn
/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp rebuild
popd
node bin/scripts/install_plugins
node_modules/grunt-cli/bin/grunt dist-all

%install
mkdir -p %{buildroot}/opt/countly %{buildroot}/usr/bin
cp -r * %{buildroot}/opt/countly/
ln -s ../../opt/countly/bin/commands/countly.sh  %{buildroot}/usr/bin/countly
ln -s ../../usr/bin/node  %{buildroot}/usr/bin/nodejs
mkdir -p %{buildroot}%{_initddir}
%if 0%{?rhel} == 6
cp %{SOURCE1} %{buildroot}%{_initddir}/countly
%endif
%if 0%{?rhel} == 7
install -p -D -m 0644 %{SOURCE2} %{buildroot}%{_unitdir}/countly-api.service
install -p -D -m 0644 %{SOURCE3} %{buildroot}%{_unitdir}/countly-dashboard.service
%endif

%post
%if 0%{?rhel} == 6
/sbin/chkconfig --add countly
bash /opt/countly/bin/scripts/detect.init.sh
%endif
%if 0%{?rhel} == 7
%systemd_post countly-api.service
%systemd_post countly-dashboard.service
%endif

##upgrade graph colors for new UI
#mv $DIR/../frontend/express/public/javascripts/countly/countly.config.js $DIR/../frontend/express/public/javascripts/countly/countly.config.backup.js
#cp -n $DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js $DIR/../frontend/express/public/javascripts/countly/countly.config.js

##upgrade plugins
for i in `find /opt/countly/plugins/* -maxdepth 0 -type d`; do nodejs $i/install.js; done

##add new plugins
countly plugin enable compare
countly plugin enable server-stats
countly plugin enable slipping-away-users
countly plugin enable star-rating

##add indexes
nodejs /opt/countly/bin/scripts/add_indexes.js

%preun
%if 0%{?rhel} == 6
/etc/init.d/countly stop
%endif
%if 0%{?rhel} == 7
%systemd_preun countly-api.service
%systemd_preun countly-dashboard.service
%endif

%postun
%if 0%{?rhel} == 7
%systemd_postun countly-api.service
%systemd_postun countly-dashboard.service
%endif

%files
%if 0%{?rhel} == 6
%attr(755, root, root) %{_initddir}/countly
%endif
%if 0%{?rhel} == 7
%{_unitdir}/countly-api.service
%{_unitdir}/countly-dashboard.service
%endif
/opt/countly
/usr/bin/countly
/usr/bin/nodejs
%config /opt/countly/frontend/express/config.js
%config /opt/countly/api/config.js
%config /opt/countly/frontend/express/public/javascripts/countly/countly.config.js
%config /opt/countly/plugins/plugins.json

%changelog
* Wed Apr 26 2017 Sergey Alembekov <sa@count.ly> - 17.04-1
- prerelease 17.04

* Mon Apr 25 2017 Sergey Alembekov <sa@count.ly> - 16.12.3-7
- release 16.12.3

* Mon Apr 17 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-7
- add systemd service files for centos7 

* Thu Mar 09 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-6
- rebuild for centos7

* Tue Feb 28 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-5
- fix upgrade procedure

* Tue Feb 21 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-4
- add postinstall upgrade procedure

* Mon Feb 17 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-3
- add postun section
- include symlink to files section 
- nginx config fixed
- remove unneded zsh dependency

* Mon Feb 13 2017 Sergey Alembekov <sa@count.ly> - 16.12.2-2
- cosmetic fixes

* Fri Jan 20 2017 Sergey Alembekov <sa@count.ly> - 16.12.2
- new release

* Tue Jan 17 2017 Sergey Alembekov <sa@count.ly> - 16.12.1
- initial build
