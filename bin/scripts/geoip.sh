#!/usr/bin/env node
const exec = require("child_process").exec;
const geoip = require('geoip-lite');

exec("countly update geoip", (err, stdout, stderr) => {
    if (err) console.log('something went wrong while updating geoip.');
    else {
        console.log(stdout);
        geoip.reloadDataSync();
        exec("countly update devices", (err, stdout, stderr) => {
            if (err) console.log('something went wrong while updating devices.');
            else {
                console.log('Devices updated.');
            }
            // run first day of every month at 01.00 pm
            exec('(crontab -l 2>/dev/null; echo "00 01 1 * * $DIR/scripts/geoip.sh -with args") | crontab -', (err, stdout, stderr) => {
                if (err) console.log('something went wrong while adding crontab');
                else {
                    console.log('Added cronjob for geoip update.');
                }
            })
        });  
    }
});