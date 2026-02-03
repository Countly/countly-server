/**
 * Module returning hostname value
 * @module api/parts/mgmt/ip
 */

import net from 'net';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require('../../../../plugins/pluginManager.js');
const icanhazip = require('icanhazip');
const logModule = require('../../../utils/log.js');

const log = logModule('core:api') as { e: (...args: unknown[]) => void };

/**
 * IP module interface
 */
interface IpModule {
    getHost: (callback: (err: Error | string | null | undefined, host?: string) => void) => void;
}

/**
 * Strip trailing slash
 * @param str - string from which to remove trailing slash
 * @returns modified string
 */
function stripTrailingSlash(str: string): string {
    if (str.substr(str.length - 1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

/**
 * Try to get ip address through network, by connecting to external resource
 * @param callback - callback function that returns the ip address
 */
function getNetworkIP(callback: (err: Error | undefined, ip: string) => void): void {
    const socket = net.createConnection(80, 'www.google.com');
    socket.setTimeout(1000);
    socket.on('connect', function() {
        callback(undefined, socket.address()?.toString() || 'localhost');
        socket.end();
    });
    socket.on('error', function(e: Error) {
        callback(e, 'localhost');
    });
}

const ip: IpModule = {
    /**
     * Function to get the hostname/ip address/url to access dashboard
     * @param callback - callback function that returns the hostname
     */
    getHost: function(callback: (err: Error | string | null | undefined, host?: string) => void): void {
        // If host is set in config.js use that, otherwise get the external IP from ifconfig.me
        let domain = plugins.getConfig('api').domain || process.env.COUNTLY_CONFIG_HOSTNAME;
        const offlineMode = plugins.getConfig('api').offline_mode;

        if (domain) {
            if (!domain.includes('://')) {
                domain = 'http://' + domain;
            }
            callback(null, stripTrailingSlash(domain));
        }
        else {
            if (!offlineMode) {
                icanhazip.IPv4().then(function(externalIp: string) {
                    callback(null, 'http://' + externalIp);
                }).catch(function(err: Error) {
                    if (err) {
                        log.e(err);
                        getNetworkIP(function(err2: Error | undefined, ipaddress: string) {
                            callback(err2, 'http://' + ipaddress);
                        });
                    }
                });
            }
            else {
                callback('Offline Mode');
            }
        }
    }
};

export default ip;
export type { IpModule };
