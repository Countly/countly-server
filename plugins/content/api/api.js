var common = require('../../../api/utils/common.js'),
    log = common.log('content:api'),
    plugins = require('../../pluginManager.js'),
    countlyFs = require('../../../api/utils/countlyFs.js');
const FEATURE_NAME = 'content';
const fs = require('fs');
const sharp = require('sharp');

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

        await uploadAssetToGridFs(myname, params.files.assets, metadata, params.qstring.thumbnail);
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
    * @param {object} b64Thumbnail - thumbnail Base64String
    * @returns {object} Promise
    **/
function uploadAssetToGridFs(myname, myfile, metadata, b64Thumbnail) {
    return new Promise(function(resolve, reject) {
        var tmp_path = myfile.path;
        var type = myfile.type;
        if (false) {
            //TODO:decide on file size limit and formats
            fs.unlink(tmp_path, function() {});
            reject(Error('File Size exceeds 1.5MB'));
        }
        else {
            fs.readFile(tmp_path, async(err, data) => {
                if (err) {
                    reject(Error(err));
                }
                //convert file to data
                if (data) {
                    try {
                        let thumbnail;
                        if (b64Thumbnail) {
                            //video file
                            const buffer = Buffer.from(b64Thumbnail.split(",")[1], 'base64');
                            thumbnail = await sharp(buffer).resize(200).toBuffer();
                        }
                        else {
                            thumbnail = await sharp(data).resize(200).toBuffer();
                        }
                        metadata.thumbnail = thumbnail;
                        metadata.mimeType = type;
                        countlyFs.gridfs.saveData("content_assets", myname, data, {metadata}, function(err2) {
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
