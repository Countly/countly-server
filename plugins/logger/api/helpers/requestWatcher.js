module.exports = {
    count: 0,
    lastMinuteTime: Date.now(),
    incrementCount() {
        this.count += 1;
    },
    resetCount() {
        this.count = 0;
    },
    resetTime() {
        this.lastMinuteTime = Date.now();
    },
    reset() {
        this.resetCount();
        this.resetTime();
    }
};