/**
* Streaming a MongoDB cursor with a per-document transform.
* @module api/utils/cursorStream
*/

const { Transform } = require('stream');

/**
 * Stream a cursor, passing each document through `options.transform` when one is given.
 *
 * MongoDB driver 7 no longer accepts a `transform` option on `cursor.stream()` and silently
 * ignores it. This does what driver 6 did with that option: pipe the plain cursor stream
 * through an object-mode Transform. `cursor.map()` is not the same thing, because a map that
 * returns null throws, while here a null or undefined result is simply not passed on.
 *
 * @param {object} cursor - a MongoDB cursor, or anything with a `stream()` returning a Readable
 * @param {object} [options] - stream options
 * @param {Function} [options.transform] - called with each document, returns what to emit
 * @returns {stream.Readable} the document stream
 */
function cursorStream(cursor, options) {
    const readable = cursor.stream();
    const transform = options && options.transform;
    if (!transform) {
        return readable;
    }
    const transformed = readable.pipe(new Transform({
        objectMode: true,
        highWaterMark: 1,
        transform(chunk, _, callback) {
            try {
                callback(undefined, transform(chunk));
            }
            catch (err) {
                callback(err);
            }
        }
    }));
    // errors on the cursor side do not cross a pipe, so surface them where the caller listens
    readable.on('error', err => transformed.emit('error', err));
    return transformed;
}

module.exports = cursorStream;
