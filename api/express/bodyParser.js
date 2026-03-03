/**
 * Body parsing middleware for the Countly API server.
 * Replicates the exact formidable-based POST parsing from the original
 * handleRequest() function in api.js, preserving all edge cases including
 * multipart form-data, crash symbol uploads (raw buffer), and formidable v1
 * backward-compatibility shims.
 * @module api/express/bodyParser
 */

const formidable = require('formidable');

/**
 * Normalize formidable v3 file objects to have v1-compatible properties
 * @param {object} files - formidable files object
 */
function normalizeFiles(files) {
    for (let i in files) {
        if (Array.isArray(files[i])) {
            files[i].forEach((file) => {
                if (file.filepath) {
                    file.path = file.filepath;
                }
                if (file.mimetype) {
                    file.type = file.mimetype;
                }
                if (file.originalFilename) {
                    file.name = file.originalFilename;
                }
            });
        }
        else {
            if (files[i].filepath) {
                files[i].path = files[i].filepath;
            }
            if (files[i].mimetype) {
                files[i].type = files[i].mimetype;
            }
            if (files[i].originalFilename) {
                files[i].name = files[i].originalFilename;
            }
        }
    }
}

/**
 * Create the body parser middleware
 * @param {object} countlyConfig - Countly API config object
 * @returns {Function} Express middleware
 */
function createBodyParser(countlyConfig) {
    return function bodyParserMiddleware(req, res, next) {
        if (req.method.toLowerCase() !== 'post') {
            return next();
        }

        const formidableOptions = {multiples: true};
        if (countlyConfig.api.maxUploadFileSize) {
            formidableOptions.maxFileSize = countlyConfig.api.maxUploadFileSize;
        }

        const form = new formidable.IncomingForm(formidableOptions);

        // Accumulate raw body - buffer array for crash symbols, string for everything else
        if (/crash_symbols\/(add_symbol|upload_symbol)/.test(req.url)) {
            req.body = [];
            req.on('data', (data) => {
                req.body.push(data);
            });
        }
        else {
            req.body = '';
            req.on('data', (data) => {
                req.body += data;
            });
        }

        let multiFormData = false;
        if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
            multiFormData = true;
        }

        form.parse(req, (err, fields, files) => {
            normalizeFiles(files);

            // Store parsed files on req for downstream access
            req.countlyFiles = files;

            if (multiFormData) {
                req.countlyFields = {};
                let formDataUrl = [];
                for (const i in fields) {
                    req.countlyFields[i] = fields[i];
                    formDataUrl.push(`${i}=${fields[i]}`);
                }
                req.countlyFormDataUrl = formDataUrl.join('&');
            }
            else {
                req.countlyFields = {};
                for (const i in fields) {
                    req.countlyFields[i] = fields[i];
                }
            }

            next();
        });
    };
}

module.exports = {createBodyParser};
