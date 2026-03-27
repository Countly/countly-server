'use strict';

// ReadPreference, WriteConcern, ReadConcern are MongoDB concepts
// that don't directly map to PostgreSQL. We accept them for API
// compatibility but they are essentially no-ops since PostgreSQL
// handles consistency differently.

class ReadPreference {
  constructor(mode, tags, options) {
    this.mode = mode;
    this.tags = tags || [];
    this.maxStalenessSeconds = options?.maxStalenessSeconds;
    this.hedge = options?.hedge;
  }

  static get PRIMARY() { return 'primary'; }
  static get PRIMARY_PREFERRED() { return 'primaryPreferred'; }
  static get SECONDARY() { return 'secondary'; }
  static get SECONDARY_PREFERRED() { return 'secondaryPreferred'; }
  static get NEAREST() { return 'nearest'; }

  static get primary() { return new ReadPreference('primary'); }
  static get primaryPreferred() { return new ReadPreference('primaryPreferred'); }
  static get secondary() { return new ReadPreference('secondary'); }
  static get secondaryPreferred() { return new ReadPreference('secondaryPreferred'); }
  static get nearest() { return new ReadPreference('nearest'); }

  isValid() {
    return ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'].includes(this.mode);
  }
}

module.exports = { ReadPreference };
