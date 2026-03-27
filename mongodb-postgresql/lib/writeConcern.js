'use strict';

class WriteConcern {
  constructor(w, wtimeout, j) {
    if (typeof w === 'object' && w !== null && !Array.isArray(w)) {
      this.w = w.w;
      this.wtimeout = w.wtimeout;
      this.j = w.j;
    } else {
      this.w = w;
      this.wtimeout = wtimeout;
      this.j = j;
    }
  }

  static get MAJORITY() { return 'majority'; }

  static fromOptions(options) {
    if (!options) return undefined;
    if (options.writeConcern) {
      return new WriteConcern(options.writeConcern);
    }
    if (options.w != null || options.wtimeout != null || options.j != null) {
      return new WriteConcern(options.w, options.wtimeout, options.j);
    }
    return undefined;
  }
}

module.exports = { WriteConcern };
