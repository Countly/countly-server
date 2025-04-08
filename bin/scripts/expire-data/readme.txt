Starting version 24.10 we are writing all drill events in single collection: drill_events.

Data collected before upgrade are collected in collections drill_events+HASH.
If there is still data present, it is advised to run also those scripts from old_scripts subfolder when running same named script from this folder:

/county_multi_app_expireData.js
/county_single_app_expireData.js
/county_single_app_expireDataBatches.js