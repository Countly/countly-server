const requestWatcher = require('./requestWatcher');

module.exports = {
    MAX_ELAPSED_TIME_IN_SECONDS: 60,
    SECONDS_TO_MS_RATIO: 1000,
    lastIncomingRequestTime: null,
    hasTimeExpired: false,
    setHasTimeExpired(value) {
        this.hasTimeExpired = value;
    },
    findHasTimeExpired() {
        var timeDifferenceInMs = this.lastIncomingRequestTime - requestWatcher.lastMinuteTime;
        return Math.floor(timeDifferenceInMs / this.SECONDS_TO_MS_RATIO) > this.MAX_ELAPSED_TIME_IN_SECONDS;
    },
    hasRequestNumberExceeded(limit) {
        return requestWatcher.count > limit;
    },
    shouldTurnOffRequestLogger(limit) {
        if (limit === 0) {
            return true;
        }
        return !this.hasTimeExpired && this.hasRequestNumberExceeded(limit);
    },
    updateOnIncomingRequest() {
        this.lastIncomingRequestTime = Date.now();
        this.setHasTimeExpired(this.findHasTimeExpired());
        if (this.hasTimeExpired) {
            requestWatcher.reset();
        }
        requestWatcher.incrementCount();
    },
};