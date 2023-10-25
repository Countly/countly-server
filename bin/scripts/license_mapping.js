const http = require('http');
const https = require('https');
const url = "https://stats.count.ly/o/license-generator/list?app_id=633b1796ff6957bdc9360aef&iDisplayStart=0&iDisplayLength=1000";
let auth_token = 'token_here';

if (process.argv[2]) {
    auth_token = process.argv[2];
}

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

async function run() {
    try {
        let {body} = await httpRequest(url, { method: 'POST' }, {auth_token: auth_token});
        body = JSON.parse(body);
        const map = {};
        if (body?.aaData?.length) {
            body.aaData.forEach(lic=>{
                if (lic.domain) {
                    let domain = lic.domain.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '');
                    map[domain] = lic._id;
                }
                else {
                    // map[lic.name] = lic._id
                }
            });
        }
        console.log(JSON.stringify(map));
    }
    catch (e) {
        return console.error('mapping failed:', e);
    }
}
run();