var common = require('../../../api/utils/common.js'),
    log = common.log('content:api'),
    plugins = require('../../pluginManager.js'),
    countlyFs = require('../../../api/utils/countlyFs.js');
const FEATURE_NAME = 'content';
const fs = require('fs');

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

plugins.register('/o/content/assets', async function(ob) {
    //TODO: add pagination
    try {
        let files = await getAssets();
        common.returnOutput(ob.params, files);
    }
    catch (error) {
        common.returnMessage(ob.params, 500, error);
    }
});

plugins.register('/i/content/asset-upload', async function(ob) {
    try {
        var params = ob.params;
        const metadata = {
            tags: params.qstring.tags || [],
        };

        let assets = params.files.assets;
        let myname = assets.name;

        await uploadAssetToGridFs(myname, params.files.assets, metadata);
        common.returnOutput(ob.params, 'Success');
    }
    catch (error) {
        common.returnMessage(ob.params, 500, error);
    }
});

plugins.register('/o/content/content-blocks', function() {
    log.log("TODO");
});

// eslint-disable-next-line require-jsdoc
function getAssets() {
    return new Promise(function(resolve, reject) {
        countlyFs.gridfs.listFiles("content_assets", function(err, files) {
            if (err) {
                reject(err);
            }
            resolve(files);
        });
    });

}

/**
    * Used for file upload
    * @param {string} myname - input name
    * @param {object} myfile - file object
    * @param {object} metadata - metadata object
    * @returns {object} Promise
    **/
function uploadAssetToGridFs(myname, myfile, metadata) {
    return new Promise(function(resolve, reject) {
        var tmp_path = myfile.path;
        var type = myfile.type;
        if (myfile.size > 1.5 * 1024 * 1024) {
            fs.unlink(tmp_path, function() {});
            reject(Error('File Size exceeds 1.5MB'));
        }
        else {
            fs.readFile(tmp_path, (err, data) => {
                if (err) {
                    reject(Error(err));
                }
                //convert file to data
                if (data) {
                    try {
                        var data_uri_prefix = "data:" + type + ";base64,";
                        var buf = Buffer.from(data);
                        var image = buf.toString('base64');
                        image = data_uri_prefix + image;
                        countlyFs.gridfs.saveData("content_assets", myname, image, {metadata}, function(err2) {
                            fs.unlink(tmp_path, function() {});
                            if (err2) {
                                return reject(err2);
                            }
                            resolve();
                        });
                    }
                    catch (SyntaxError) {
                        reject(Error(SyntaxError));
                    }
                }
                else {
                    reject(Error('no data'));
                }
            });
        }
    });
}



/*
block{
    _id: ObjectId,
    app_id: ObjectId,
    type: String,
    assets: [ObjectId],
    data: Object
}
asset{
    _id: ObjectId,
    tags: [ObejctId],
    name:'a',
    contentBlocks: [ObjectId],
}
*/
