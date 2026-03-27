'use strict';

class ReadConcern {
  constructor(level) {
    this.level = level;
  }

  static get LOCAL() { return 'local'; }
  static get AVAILABLE() { return 'available'; }
  static get MAJORITY() { return 'majority'; }
  static get LINEARIZABLE() { return 'linearizable'; }
  static get SNAPSHOT() { return 'snapshot'; }

  static fromOptions(options) {
    if (!options) return undefined;
    if (options.readConcern) {
      if (typeof options.readConcern === 'string') {
        return new ReadConcern(options.readConcern);
      }
      return new ReadConcern(options.readConcern.level);
    }
    return undefined;
  }
}

module.exports = { ReadConcern };
