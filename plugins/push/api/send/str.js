const { Duplex, Stream } = require('stream');

/**
 * asd
 */
class Str extends Duplex {
    /**
     * asd
     */
    constructor() {
        super({readableObjectMode: true, writableObjectMode: true, highWaterMark: 100});
        this.inbox = [];
        this.outbox = [];
    }

    /**
     * Reads results from connections
     * @param {asd} size asd 
     */
    _read(size) {
        console.log(`Reading ${size} bytes, outbox is ${this.outbox.length}`);
        if (this.outbox.length) {
            this.push(this.outbox);
            this.outbox = [];
        }
        // while (this.outbox.length && size > 0) {
        //     this.push(this.outbox.shift());
        //     size -= 100;
        // }
        // this.pause();
    }

    /**
     * Writes messages to connections
     * @param {array} chunks Array of chunks
     * @param {callback} callback called when the frame is fully processed
     */
    _writev(chunks, callback) {
        let t = Math.round(Math.random() * 100);
        console.log(`Will wait for ${t}ms to process ${chunks.length} chunks`);
        setTimeout(() => {
            console.log(`Pushing ${1}, outboxing ${chunks.length - 1}`);
            for (let i = 1; i < chunks.length; i++) {
                this.outbox.push(chunks[i]);
            }
            this.push(chunks[0].chunk);

            // chunks.forEach(ch => {
            //     if (this.readableFlowing) {
            //         this.outbox.push(ch.chunk);
            //     }
            //     else {
            //         this.push(ch.chunk);
            //     }
            // });
            // this.resume();
            callback(null);
        }, t);
    }
}

let total = 0,
    str = new Str();

str.on('data', data => {
    console.log('data', data);
});


/**
 * asd
 */
function next() {
    if (str.writableLength < str.writableHighWaterMark) {
        let now = Date.now();
        while (str.write(total++)) {
            console.log('written ' + (total - 1));
        }
        console.log('done writing on ' + (total - 1) + ', waiting');
        if (total < 1000) {
            setImmediate(next);
        }
    }
    else {
        console.log('not writing');
        setTimeout(next, 10);
    }
    // str.write(total++, null, () => {
    //     if (total > 100) {
    //         console.log(`... DONE writing`);
    //     }
    //     else {
    //         console.log(`... topping up after ${Math.round(Date.now() - now)}ms`);
    //         setImmediate(next);
    //     }
    // });
}

next();

// str.pipe(process.stdout);
