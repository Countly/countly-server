FROM node:10-jessie-slim

ENV INSIDE_DOCKER 1
ENV COUNTLY_SERVICE_NAME ""
ENV TINI_VERSION v0.18.0

WORKDIR /opt/countly
COPY . .

# Add Tini
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends git g++ make automake autoconf libtool pkg-config locales unzip sqlite3 python && \
    rm -rf /var/lib/apt/lists/* && \
    echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && \
    locale-gen en_US.UTF-8

# Apply configs
RUN mv frontend/express/public/javascripts/countly/countly.config.sample.js frontend/express/public/javascripts/countly/countly.config.js && \
    mv frontend/express/config.sample.js frontend/express/config.js && \
    mv api/config.sample.js api/config.js && \
    mv plugins/plugins.default.json plugins/plugins.json && \
    find /opt/countly/bin -name "*.sh" -exec chmod +x {} \;

# Install countly CLI
WORKDIR /opt/countly/bin
RUN scripts/detect.init.sh && \
    scripts/install.nghttp2.sh

# Install countly
WORKDIR /opt/countly
RUN npm install -g grunt-cli node-gyp && \
    npm install && \
    grunt dist-all && \
    node bin/scripts/install_plugins && \
    countly update sdk-web

# Fix permissions for node_modules and generated files & cleanup
RUN chmod -R g=u . && \
    apt-get remove -y git g++ make automake autoconf libtool pkg-config locales unzip sqlite3 python && \
    apt-get clean

# Avoid zombies & remap exit code 143 to 0
ENTRYPOINT ["/tini", "-v", "-e", "143", "--"]
CMD [ "countly", "start" ]
USER 1001
