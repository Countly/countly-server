FROM phusion/baseimage:0.11

CMD ["/sbin/my_init"]

## Setup Countly
ENV INSIDE_DOCKER 1

EXPOSE 80

## Add MongoDB data volume
VOLUME ["/var/lib/mongodb"]

COPY / /opt/countly

RUN  useradd -r -M -U -d /opt/countly -s /bin/false countly && \
    mkdir -p /etc/sudoers.d && \
	echo "countly ALL=(ALL) NOPASSWD: /usr/bin/sv restart countly-api countly-dashboard" >> /etc/sudoers.d/countly && \
    apt-get update && apt-get -y install sudo && \
	/opt/countly/bin/countly.install.sh && \
    chown -R mongodb:mongodb /var/lib/mongodb && \
    \
    mkdir /etc/service/mongodb && \
    mkdir /etc/service/nginx && \
    mkdir /etc/service/countly-api && \
    mkdir /etc/service/countly-dashboard && \
    echo "" >> /etc/nginx/nginx.conf && \
    echo "daemon off;" >> /etc/nginx/nginx.conf && \
    \
    cp /opt/countly/bin/commands/docker/mongodb.sh /etc/service/mongodb/run && \
    cp /opt/countly/bin/commands/docker/nginx.sh /etc/service/nginx/run && \
    cp /opt/countly/bin/commands/docker/countly-api.sh /etc/service/countly-api/run && \
    cp /opt/countly/bin/commands/docker/countly-dashboard.sh /etc/service/countly-dashboard/run && \
    \
    chown mongodb /etc/service/mongodb/run && \
	chown root /etc/service/nginx/run && \
	chown -R countly:countly /opt/countly && \
    \
    apt-get autoremove -y && \
    apt-get -y install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm -rf /tmp/* /tmp/.??* /var/tmp/* /var/tmp/.??* /root/.npm && \
    mkdir /opt/countly/.npm && chown -R 1001:0 /opt/countly/.npm
