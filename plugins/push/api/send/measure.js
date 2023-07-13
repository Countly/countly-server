/**
 * 1-second based timeseries for throughoutput calclulation
 */
class Measurement {
    /**
     * Initializes new measurement
     */
    constructor() {
        this.data = {};
    }

    /**
     * Gets second from the timestamp given
     * 
     * @param {number} date timestamp, now by default
     * @returns {number} second since epoch as int
     */
    sec(date = Date.now()) {
        return Math.floor(date / 1000) | 0;
    }

    /**
     * Increments current moment data point with the provided number
     * 
     * @param {number} num increment for the data point
     */
    inc(num) {
        let sec = this.sec();
        this.data[sec] = (this.data[sec] || 0) + num;
    }

    /**
     * Get an average aggregation for given period ending now by default
     *  
     * @param {number} seconds averaging period
     * @param {number} end ms timestamp of the end of the period
     * @returns {number} average metric for given period
     */
    avg(seconds, end = Date.now()) {
        end = this.sec(end);

        let sum = 0;
        for (let sec = end - 1; sec >= end - seconds; sec--) {
            sum += this.data[sec] || 0;
        }

        return (sum / (seconds || 1)).toFixed(0);
    }
}

module.exports = Measurement;