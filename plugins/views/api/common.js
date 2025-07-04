/**
     *  Check if view count is alread updated somewhere else and fix it
     *  @param {Array} updates - array with updates
     *  @param {number} inc - amount to increment
     *  @param {number} set - amount to set
     */
const checkViewQuery = function(updates, inc, set) {
    var needUpdate = true;
    for (let i = 0; i < updates.length; i++) {
        if (inc && updates[i] && updates[i].$set && typeof updates[i].$set.vc === "number") {
            updates[i].$set.vc = updates[i].$set.vc + inc;
            needUpdate = false;
            break;
        }
        else if (typeof set !== "undefined" && updates[i] && updates[i].$inc && updates[i].$inc.vc) {
            set += updates[i].$inc.vc;
            delete updates[i].$inc.vc;
        }
    }

    if (needUpdate) {
        if (typeof set !== "undefined") {
            updates.push({$set: {vc: set}});
        }
        else if (inc) {
            updates.push({$inc: {vc: inc}});
        }
    }
};

module.exports = {
    checkViewQuery
};