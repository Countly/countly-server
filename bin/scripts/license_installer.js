/**
 * @version 3.1 only delete license history when the exact jwt is matched (will not delete all installations of same license id)
 * @version 3.0 added ability to run again, will only update if the license jwt is mismatched
 */
var DB = 'countly';
let auth_token = 'token_here';

const jwt = require('./../../node_modules/jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const https = require('https');
const pluginManager = require('./../../plugins/pluginManager.js');
const licenseId = process.argv[2];

function httpRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;

        const req = lib.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                const response = {
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                };
                resolve(response);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.setHeader('Content-Type', 'application/json');
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}


if (process.argv[3]) {
    console.log('using auth token from command line');
    auth_token = process.argv[3];
}

if (!licenseId) {
    throw new Error('no license id');
}

pluginManager.dbConnection(DB).then(async(countlyDb) => {

    try {
        const {body} = await httpRequest('https://stats.count.ly/o/license-generator/download/' + licenseId, { method: 'POST' }, {auth_token: auth_token});
        var obj = {};
        const license = body;
        const cert = await fs.readFile(path.resolve(__dirname, './../../plugins/drill/files/public.pem'));
        console.log('key read success');
        const decoded = jwt.verify(license, cert, { algorithms: ['RS256'] });
        console.log('decode success for license_id', decoded._id);
        obj.content = {license};
        obj.activated_at = parseInt(Date.now() / 1000, 10);
        obj.license_id = decoded._id;
        const currentLicense = await countlyDb.collection('plugins').findOne({_id: 'license'});
        const existingLicense = await countlyDb.collection('licenses').findOne({ _id: decoded._id });

        if (currentLicense?.content?.license === license) {
            console.log('entirely same license, doing nothing, exiting');
        }
        else {
            if (existingLicense) {
                console.log("License already exists, re-installing");
                await countlyDb.collection('plugins').remove({_id: 'license'});
                // await countlyDb.collection('licenses').remove({'content.license': license});
            }

            console.log('start existing license check');
            if (currentLicense) {
                const currentLicenseDecoded = jwt.verify(currentLicense.content.license, cert, { algorithms: ['RS256'] });
                const currentTier = currentLicenseDecoded.tiers.find(tier => tier.is_active);
                currentTier.rule = currentLicenseDecoded.rule;
                obj.previousTier = currentTier;
            }

            obj._id = 'license';
            await countlyDb.collection('plugins').save(obj);
            obj._id = decoded._id;
            await countlyDb.collection('licenses').save(obj);
            await countlyDb.collection('plugins').updateOne({_id: 'plugins'}, {$unset: {licenseEmails: 1}});
            await countlyDb.collection('plugins').update({_id: 'license'}, {$unset: {metrics_check: 1}});
            const pluginsDoc = await countlyDb.collection('plugins').findOne({_id: 'plugins'});
            if (!pluginsDoc.remoteConfig) {
                await countlyDb.collection('plugins').updateOne({_id: 'plugins'}, {$set: {remoteConfig: {}}});
            }
        }

        console.log('license updation complete');
        countlyDb.close();
        process.exit(0);
    }
    catch (error) {
        console.error('download failed:', error);
        countlyDb.close();
        process.exit(0);
    }
});
