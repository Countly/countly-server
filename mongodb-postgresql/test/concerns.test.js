'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ReadPreference } = require('../lib/readPreference');
const { WriteConcern } = require('../lib/writeConcern');
const { ReadConcern } = require('../lib/readConcern');

describe('ReadPreference', () => {
  describe('constructor', () => {
    it('should store mode', () => {
      const rp = new ReadPreference('primary');
      assert.strictEqual(rp.mode, 'primary');
    });

    it('should store tags and options', () => {
      const rp = new ReadPreference('secondary', [{ dc: 'east' }], { maxStalenessSeconds: 90 });
      assert.deepStrictEqual(rp.tags, [{ dc: 'east' }]);
      assert.strictEqual(rp.maxStalenessSeconds, 90);
    });

    it('should default tags to empty array', () => {
      const rp = new ReadPreference('primary');
      assert.deepStrictEqual(rp.tags, []);
    });
  });

  describe('static constants', () => {
    it('should have correct string values', () => {
      assert.strictEqual(ReadPreference.PRIMARY, 'primary');
      assert.strictEqual(ReadPreference.PRIMARY_PREFERRED, 'primaryPreferred');
      assert.strictEqual(ReadPreference.SECONDARY, 'secondary');
      assert.strictEqual(ReadPreference.SECONDARY_PREFERRED, 'secondaryPreferred');
      assert.strictEqual(ReadPreference.NEAREST, 'nearest');
    });
  });

  describe('static instances', () => {
    it('should return ReadPreference instances', () => {
      assert.ok(ReadPreference.primary instanceof ReadPreference);
      assert.strictEqual(ReadPreference.primary.mode, 'primary');
      assert.ok(ReadPreference.primaryPreferred instanceof ReadPreference);
      assert.ok(ReadPreference.secondary instanceof ReadPreference);
      assert.ok(ReadPreference.secondaryPreferred instanceof ReadPreference);
      assert.ok(ReadPreference.nearest instanceof ReadPreference);
    });
  });

  describe('isValid', () => {
    it('should return true for valid modes', () => {
      assert.ok(new ReadPreference('primary').isValid());
      assert.ok(new ReadPreference('primaryPreferred').isValid());
      assert.ok(new ReadPreference('secondary').isValid());
      assert.ok(new ReadPreference('secondaryPreferred').isValid());
      assert.ok(new ReadPreference('nearest').isValid());
    });

    it('should return false for invalid mode', () => {
      assert.ok(!new ReadPreference('invalid').isValid());
      assert.ok(!new ReadPreference('').isValid());
    });
  });
});

describe('WriteConcern', () => {
  describe('constructor', () => {
    it('should accept w, wtimeout, j as separate args', () => {
      const wc = new WriteConcern('majority', 5000, true);
      assert.strictEqual(wc.w, 'majority');
      assert.strictEqual(wc.wtimeout, 5000);
      assert.strictEqual(wc.j, true);
    });

    it('should accept an object', () => {
      const wc = new WriteConcern({ w: 2, wtimeout: 1000, j: false });
      assert.strictEqual(wc.w, 2);
      assert.strictEqual(wc.wtimeout, 1000);
      assert.strictEqual(wc.j, false);
    });

    it('should handle numeric w', () => {
      const wc = new WriteConcern(1);
      assert.strictEqual(wc.w, 1);
    });
  });

  describe('MAJORITY constant', () => {
    it('should equal "majority"', () => {
      assert.strictEqual(WriteConcern.MAJORITY, 'majority');
    });
  });

  describe('fromOptions', () => {
    it('should return undefined for null options', () => {
      assert.strictEqual(WriteConcern.fromOptions(null), undefined);
    });

    it('should return undefined for empty options', () => {
      assert.strictEqual(WriteConcern.fromOptions({}), undefined);
    });

    it('should extract from writeConcern property', () => {
      const wc = WriteConcern.fromOptions({ writeConcern: { w: 'majority' } });
      assert.ok(wc instanceof WriteConcern);
      assert.strictEqual(wc.w, 'majority');
    });

    it('should extract from top-level w/wtimeout/j', () => {
      const wc = WriteConcern.fromOptions({ w: 1, j: true });
      assert.ok(wc instanceof WriteConcern);
      assert.strictEqual(wc.w, 1);
      assert.strictEqual(wc.j, true);
    });

    it('should prefer writeConcern property over top-level', () => {
      const wc = WriteConcern.fromOptions({
        writeConcern: { w: 'majority' },
        w: 1
      });
      assert.strictEqual(wc.w, 'majority');
    });
  });
});

describe('ReadConcern', () => {
  describe('constructor', () => {
    it('should store level', () => {
      const rc = new ReadConcern('majority');
      assert.strictEqual(rc.level, 'majority');
    });
  });

  describe('static constants', () => {
    it('should have correct values', () => {
      assert.strictEqual(ReadConcern.LOCAL, 'local');
      assert.strictEqual(ReadConcern.AVAILABLE, 'available');
      assert.strictEqual(ReadConcern.MAJORITY, 'majority');
      assert.strictEqual(ReadConcern.LINEARIZABLE, 'linearizable');
      assert.strictEqual(ReadConcern.SNAPSHOT, 'snapshot');
    });
  });

  describe('fromOptions', () => {
    it('should return undefined for null', () => {
      assert.strictEqual(ReadConcern.fromOptions(null), undefined);
    });

    it('should return undefined for empty options', () => {
      assert.strictEqual(ReadConcern.fromOptions({}), undefined);
    });

    it('should extract from readConcern string', () => {
      const rc = ReadConcern.fromOptions({ readConcern: 'majority' });
      assert.strictEqual(rc.level, 'majority');
    });

    it('should extract from readConcern object', () => {
      const rc = ReadConcern.fromOptions({ readConcern: { level: 'snapshot' } });
      assert.strictEqual(rc.level, 'snapshot');
    });
  });
});
