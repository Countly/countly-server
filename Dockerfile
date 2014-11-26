FROM ubuntu:trusty

ENV   DEBIAN_FRONTEND noninteractive

# REPOS
RUN   apt-get --yes update && \
      apt-get install -y software-properties-common && \
      add-apt-repository -y "deb http://archive.ubuntu.com/ubuntu $(lsb_release -sc) universe" && \
      add-apt-repository -y ppa:chris-lea/node.js && \
      add-apt-repository -y ppa:nginx/stable && \
      apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10 && \
      echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | tee /etc/apt/sources.list.d/10gen.list && \
      mkdir -p /data/db && \
      apt-get --yes update && \
      apt-get install -y -q curl git wget mongodb-10gen nodejs supervisor imagemagick nginx build-essential

#SHIMS
RUN   dpkg-divert --local --rename --add /sbin/initctl && \
      rm /sbin/initctl && \
      ln -s /bin/true /sbin/initctl

ENV   DEBIAN_FRONTEND dialog

## Setup Countly
COPY   / /opt/countly
RUN   mkdir -p /data/log && \
      cd /opt/countly/api ; npm install time  && \
      rm /etc/nginx/sites-enabled/default && \
      cp /opt/countly/bin/config/nginx.server.conf /etc/nginx/sites-enabled/default && \
      cp /opt/countly/frontend/express/public/javascripts/countly/countly.config.sample.js  /opt/countly/frontend/express/public/javascripts/countly/countly.config.js && \
      cp /opt/countly/api/config.sample.js  /opt/countly/api/config.js && \
      cp /opt/countly/frontend/express/config.sample.js  /opt/countly/frontend/express/config.js

ADD    ./supervisor/supervisord.conf /etc/supervisor/supervisord.conf
ADD    ./supervisor/conf.d/nginx.conf /etc/supervisor/conf.d/nginx.conf
ADD    ./supervisor/conf.d/mongodb.conf /etc/supervisor/conf.d/mongodb.conf
ADD    ./supervisor/conf.d/countly.conf /etc/supervisor/conf.d/countly.conf

EXPOSE 80
VOLUME ["/data"]
CMD []
ENTRYPOINT ["/usr/bin/supervisord"]
