var parser = require('ua-parser-js');

/**
 * Normalize client hints OS version to user-facing values where needed
 * @param {string} os - OS name
 * @param {string} version - OS version from client hints
 * @returns {string|null} normalized OS version
 */
function normalizeClientHintsOsVersion(os, version) {
    if (!version) {
        return version;
    }

    if (os === 'Windows') {
        var versionParts = (version + '').split('.');
        var major = parseInt(versionParts[0], 10);
        var minor = parseInt(versionParts[1], 10);
        if (!isNaN(major)) {
            if (major >= 13) {
                return '11';
            }
            if (major >= 10) {
                return '10';
            }
            if (major === 6) {
                if (minor >= 3) {
                    return '8.1';
                }
                if (minor === 2) {
                    return '8';
                }
                if (minor === 1) {
                    return '7';
                }
                if (minor === 0) {
                    return 'Vista';
                }
            }
            if (major === 5) {
                if (minor >= 1) {
                    return 'XP';
                }
                return '2000';
            }
        }
    }

    return version;
}

/**
 * Parse client hints headers to extract browser, OS, and device information
 * @param {object} headers - HTTP request headers
 * @returns {object} Parsed client hints data
 */
function parseClientHints(headers) {
    var hints = {
        browser: null,
        browserVersion: null,
        os: null,
        osVersion: null,
        mobile: null,
        device: null
    };

    // Parse Sec-CH-UA header for browser info
    // Format: "Chromium";v="110", "Google Chrome";v="110", "Not=A?Brand";v="99"
    var secChUa = headers['sec-ch-ua'];
    if (secChUa) {
        var brands = secChUa.split(',').map(function(brand) {
            var match = brand.trim().match(/"([^"]+)";v="([^"]+)"/);
            if (match) {
                return { name: match[1], version: match[2] };
            }
            return null;
        }).filter(Boolean);

        // Filter out placeholder brands
        var validBrands = brands.filter(function(brand) {
            return !brand.name.includes('Not') && !brand.name.includes('?');
        });

        if (validBrands.length > 0) {
            // Prefer specific browser over Chromium
            var preferredBrand = validBrands.find(function(b) {
                return b.name !== 'Chromium';
            }) || validBrands[0];

            hints.browser = preferredBrand.name;
            hints.browserVersion = preferredBrand.version;
        }
    }

    // Parse full version if available.
    var secChUaFullVersion = headers['sec-ch-ua-full-version'];
    if (secChUaFullVersion && secChUaFullVersion.startsWith('"')) {
        var fullVersionMatch = secChUaFullVersion.match(/"([^"]+)"/);
        if (fullVersionMatch) {
            hints.browserVersion = fullVersionMatch[1];
        }
    }

    // Parse full version list
    var secChUaFullVersionList = headers['sec-ch-ua-full-version-list'];
    if (secChUaFullVersionList) {
        var fullVersionBrands = secChUaFullVersionList.split(',').map(function(brand) {
            var match = brand.trim().match(/"([^"]+)";v="([^"]+)"/);
            if (match) {
                return { name: match[1], version: match[2] };
            }
            return null;
        }).filter(Boolean).filter(function(brand) {
            return !brand.name.includes('Not') && !brand.name.includes('?');
        });

        if (fullVersionBrands.length > 0) {
            var preferredFullVersionBrand = null;

            if (hints.browser) {
                preferredFullVersionBrand = fullVersionBrands.find(function(b) {
                    return b.name === hints.browser;
                });
            }

            if (!preferredFullVersionBrand) {
                preferredFullVersionBrand = fullVersionBrands.find(function(b) {
                    return b.name !== 'Chromium';
                }) || fullVersionBrands[0];
            }

            hints.browserVersion = preferredFullVersionBrand.version;
        }
    }

    // Parse platform (OS)
    var secChUaPlatform = headers['sec-ch-ua-platform'];
    if (secChUaPlatform) {
        hints.os = secChUaPlatform.replace(/"/g, '');

        if (hints.os === 'macOS') {
            hints.os = 'Mac OS';
        }
    }

    // Parse platform version
    var secChUaPlatformVersion = headers['sec-ch-ua-platform-version'];
    if (secChUaPlatformVersion) {
        hints.osVersion = normalizeClientHintsOsVersion(hints.os, secChUaPlatformVersion.replace(/"/g, ''));
    }

    // Parse mobile indicator
    var secChUaMobile = headers['sec-ch-ua-mobile'];
    if (secChUaMobile) {
        hints.mobile = secChUaMobile === '?1';
    }

    // Parse device model
    var secChUaModel = headers['sec-ch-ua-model'];
    if (secChUaModel) {
        hints.device = secChUaModel.replace(/"/g, '');
    }

    return hints;
}

module.exports = function registerWebSdkPre(plugins) {
    plugins.appTypes.push("web");

    plugins.register("/sdk/pre", function(ob) {
        var params = ob.params;

        // Parse client hints first (modern approach)
        var clientHints = parseClientHints(params.req.headers);

        // Parse user agent as fallback
        var agent = parser((params.qstring.metrics && params.qstring.metrics._ua) ? params.qstring.metrics._ua : params.req.headers['user-agent']);

        // Merge client hints with user agent data (client hints take priority)
        var data = {
            os: clientHints.os || agent.os.name,
            os_version: clientHints.osVersion || agent.os.version,
            browser: clientHints.browser || agent.browser.name,
            browser_version: clientHints.browserVersion || agent.browser.version,
            mobile: clientHints.mobile,
            device: clientHints.device
        };

        // Normalize OS name
        if (data.os === "Mac OS") {
            data.os = "Mac";
        }

        // Detect mobile browsers based on OS and mobile flag
        var isMobile = data.mobile !== null ? data.mobile : (data.os === "iOS" || data.os === "Android");

        if (isMobile || data.os === "iOS" || data.os === "Android") {
            if (data.browser === "Firefox") {
                data.browser = "Firefox Mobile";
            }
            else if (data.browser === "Chrome" || data.browser === "Google Chrome") {
                data.browser = "Chrome Mobile";
            }
            else if (data.browser === "Edge" || data.browser === "Microsoft Edge") {
                data.browser = "Edge Mobile";
            }
        }

        // Detect Edge Chromium
        if (data.browser === "Edge" || data.browser === "Microsoft Edge" || agent.browser.name === "Edge") {
            if (agent.engine.name === "WebKit" || agent.engine.name === "Blink") {
                data.browser = "Edge Chromium";
            }
        }

        // Normalize browser names from client hints
        if (data.browser === "Google Chrome") {
            data.browser = "Chrome";
        }
        else if (data.browser === "Microsoft Edge") {
            data.browser = "Edge";
        }

        if (params.qstring.begin_session) {
            //try to add metrics based on user agent and client hints
            if (!params.qstring.metrics) {
                params.qstring.metrics = {};
            }

            //if some metrics are not provided, parse them from client hints or user agent
            if (!params.qstring.metrics._browser) {
                params.qstring.metrics._browser = data.browser;
            }

            if (!params.qstring.metrics._browser_version) {
                params.qstring.metrics._browser_version = data.browser_version;
            }

            if (params.qstring.metrics._browser && params.qstring.metrics._browser_version && !params.qstring.metrics._browser_version.startsWith("[" + params.qstring.metrics._browser.toLowerCase() + "]_")) {
                params.qstring.metrics._browser_version = "[" + params.qstring.metrics._browser.toLowerCase() + "]_" + params.qstring.metrics._browser_version;
            }

            if (!params.qstring.metrics._os) {
                params.qstring.metrics._os = data.os;
            }

            if (!params.qstring.metrics._os_version) {
                params.qstring.metrics._os_version = data.os_version;
            }

            if (!params.qstring.metrics._device) {
                // Prioritize client hints device model
                if (data.device) {
                    params.qstring.metrics._device = data.device;
                }
                else if (typeof agent.device.model !== "undefined") {
                    params.qstring.metrics._device = agent.device.model;
                }
                else {
                    params.qstring.metrics._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
                }
            }

            if (!params.qstring.metrics._device_type) {
                // Determine device type from client hints mobile flag or user agent
                if (data.mobile === true) {
                    params.qstring.metrics._device_type = "mobile";
                }
                else {
                    params.qstring.metrics._device_type = agent.device.type;
                }

                //if still undefined and app is web then it must be desktop
                if (!params.qstring.metrics._device_type && params.app.type === "web") {
                    params.qstring.metrics._device_type = "desktop";
                }
            }
        }

        //check if view events need to have platform segment
        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            params.qstring.events = params.qstring.events.map(function(currEvent) {
                if ((currEvent.key === "[CLY]_view") && currEvent.segmentation && currEvent.segmentation.name && (!currEvent.segmentation.segment && !currEvent.segmentation.platform)) {
                    if (data.os) {
                        currEvent.segmentation.segment = data.os;
                    }
                }
                else if ((currEvent.key === "[CLY]_action") && currEvent.segmentation && currEvent.segmentation.view && (!currEvent.segmentation.segment && !currEvent.segmentation.platform)) {
                    if (data.os) {
                        currEvent.segmentation.segment = data.os;
                    }
                }
                else if ((currEvent.key === "[CLY]_star_rating" || currEvent.key === "[CLY]_nps" || currEvent.key === "[CLY]_survey") && currEvent.segmentation && !currEvent.segmentation.platform) {
                    currEvent.segmentation.platform = data.os;
                }
                return currEvent;
            });
        }

        //check of any crash segments can be updated
        if (typeof params.qstring.crash === "string") {
            try {
                params.qstring.crash = JSON.parse(params.qstring.crash);
            }
            catch (SyntaxError) {
                console.log('Parse crash JSON failed');
                return false;
            }
        }
        if (typeof params.qstring.crash === "object" && params.qstring.crash) {
            if (!params.qstring.crash._os) {
                params.qstring.crash._os = data.os;
            }

            if (!params.qstring.crash._os_version) {
                params.qstring.crash._os_version = data.os + " " + data.os_version;
            }

            if (!params.qstring.crash._browser) {
                params.qstring.crash._browser = data.browser;
            }

            if (!params.qstring.crash._device) {
                // Prioritize client hints device model
                if (data.device) {
                    params.qstring.crash._device = data.device;
                }
                else if (typeof agent.device.model !== "undefined") {
                    params.qstring.crash._device = agent.device.model;
                }
                else {
                    params.qstring.crash._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
                }
            }
        }
    });

};
