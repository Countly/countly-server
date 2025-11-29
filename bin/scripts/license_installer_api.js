/*
* License installer script
* This script will download license from the source server and then install it to the target server
* This script uses API endpoints, so no access to db
*
* Sample script run
* SOURCE_AUTH_TOKEN=auth_token_value TARGET_API_KEY=api_key_value SOURCE_URL=https://stats.count.ly TARGET_URL=https://client.count.ly TARGET_APP_ID=app_id_value node license_installer_api.js
*/

const client = require('got');
const FormData = require('form-data');

let auth_token = ''; // Auth token for the source server. It will be used to download the license from the source server. It can also be set with env variable SOURCE_AUTH_TOKEN
let api_key = ''; // API key for the target server. It will be used to install the license to the target server. It can also be set with env variable TARGET_API_KEY
let app_id = ''; // App id for the target server. It will be used to get domain name from target server. It can also be set with env variable TARGET_APP_ID. It does not have to be a real app id, any string that is 24 chars long will do
let sourceURL = 'https://stats.count.ly'; // URL of the source server. Source server is where the license will be downloaded from. It can also be set with env variable SOURCE_URL
let targetURL = 'http://localhost:3001'; // URL of the target server. Target server is where the license will be installed to. It can also be set with env variable TARGET_URL
let licenseDomain = ''; // The domain name that is registered in the license. The script will try to get domain name from the target server config. It can also be set with env variable LICENSE_DOMAIN

if (process.env.SOURCE_AUTH_TOKEN) {
    console.log('Using source auth token from env');
    auth_token = process.env.SOURCE_AUTH_TOKEN;
}
else if (auth_token.length === 0) {
    console.error('No auth token provided for the source server');
    process.exit(1);
}

if (process.env.TARGET_API_KEY) {
    console.log('Using target api key from env');
    api_key = process.env.TARGET_API_KEY;
}
else if (api_key.length === 0) {
    console.error('No api key provided for the target server');
    process.exit(1);
}

if (process.env.SOURCE_URL) {
    console.log('Using source URL from env');
    sourceURL = process.env.SOURCE_URL;
}
else if (sourceURL.length === 0) {
    console.error('No url provided for the source server');
    process.exit(1);
}

if (process.env.TARGET_URL) {
    console.log('Using target URL from env');
    targetURL = process.env.TARGET_URL;
}
else if (targetURL.length === 0) {
    console.error('No url provided for the target server');
    process.exit(1);
}

if (process.env.LICENSE_DOMAIN) {
    console.log('Using license domain from env');
    licenseDomain = process.env.LICENSE_DOMAIN;
}

if (process.env.TARGET_APP_ID) {
    console.log('Using app id from env');
    app_id = process.env.TARGET_APP_ID;
}
else if (app_id.length === 0 && licenseDomain.length === 0) {
    console.error('No app id provided for the target server');
    process.exit(1);
}


async function run() {
    if (licenseDomain.length === 0) {
        try {
            const urlObj = new URL(`/o/configs`, targetURL);

            const resp = await client.get(urlObj.href, {
                searchParams: {
                    api_key,
                    app_id,
                },
            }).json();

            let apiDomain = resp?.api?.domain || '';

            if (apiDomain.length === 0) {
                throw new Error('Domain not found in config');
            }

            apiDomain = apiDomain.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '');
            if (apiDomain.indexOf('www.') === 0) {
                apiDomain = apiDomain.substring(4);
            }

            licenseDomain = apiDomain;
        }
        catch (err) {
            console.error(`Failed getting domain from ${targetURL}`);
            console.error(err.response?.body || err);
            process.exit(1);
        }
    }

    let resp;
    try {
        console.log(`Downloading license list for domain ${licenseDomain} from ${sourceURL}`);
        const urlObj = new URL('/o/license-generator/list', sourceURL);

        resp = await client.post(urlObj.href, {
            searchParams: {
                iDisplayStart: 0,
                iDisplayLength: 1,
                iSortCol_0: 3,
                sSortDir_0: 'desc',
                query: JSON.stringify({
                    domain: { $regex: `^${licenseDomain}` }
                })
            },
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_token }),
        }).json();
    }
    catch (err) {
        console.error(`Failed getting license list for domain ${licenseDomain} from ${sourceURL}`);
        console.error(err.response?.body || err);
        process.exit(1);
    }

    let licenseId = '';
    if (resp?.aaData?.length > 0) {
        resp.aaData.forEach(item => {
            if (item.domain) {
                licenseId = item._id;
            }
        });
    }

    if (licenseId.length > 0) {
        let licenseContent;

        try {
            console.log(`Downloading license ${licenseId} from ${sourceURL}`);

            const urlObj = new URL(`/o/license-generator/download/${licenseId}`, sourceURL);

            licenseContent = await client.post(urlObj.href, {
                body: JSON.stringify({ auth_token }),
                headers: { 'Content-Type': 'application/json' },
            }).text();

            console.log(`License ${licenseId} downloaded`);
        }
        catch (err) {
            console.error(`Failed downloading license ${licenseId} from ${sourceURL}`);
            console.error(err.response?.body || err);
            process.exit(1);
        }

        try {
            console.log(`Installing license ${licenseId} to ${targetURL}`);

            const form = new FormData();
            form.append('api_key', api_key);
            form.append('license', Buffer.from(licenseContent), { filename: 'license.key', contentType: 'text/plain' });

            const urlObj = new URL(`/i/license/upload`, targetURL);

            await client.post(urlObj.href, {
                body: form,
                headers: form.getHeaders(),
            });

            console.log(`License ${licenseId} installed`);
        }
        catch (err) {
            console.error(`Failed installing license ${licenseId} to ${targetURL}`);
            console.error(err.response?.body || err);
            process.exit(1);
        }
    }
    else {
        console.log(`Could not find license for domain ${licenseDomain} from the license list`);
    }
}

run();
