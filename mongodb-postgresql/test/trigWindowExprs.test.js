'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AggregateTranslator } = require('../lib/aggregateTranslator');

function translateExpr(expr) {
  const at = new AggregateTranslator('t', null);
  return at.translate([{ $addFields: { result: expr } }]);
}

// ==========================
// Trigonometric functions
// ==========================
describe('Trigonometric expression operators', () => {
  it('$sin should generate SIN()', () => {
    const r = translateExpr({ $sin: '$angle' });
    assert.ok(r.sql.includes('SIN'));
  });

  it('$cos should generate COS()', () => {
    const r = translateExpr({ $cos: '$angle' });
    assert.ok(r.sql.includes('COS'));
  });

  it('$tan should generate TAN()', () => {
    const r = translateExpr({ $tan: '$angle' });
    assert.ok(r.sql.includes('TAN'));
  });

  it('$asin should generate ASIN()', () => {
    const r = translateExpr({ $asin: '$val' });
    assert.ok(r.sql.includes('ASIN'));
  });

  it('$acos should generate ACOS()', () => {
    const r = translateExpr({ $acos: '$val' });
    assert.ok(r.sql.includes('ACOS'));
  });

  it('$atan should generate ATAN()', () => {
    const r = translateExpr({ $atan: '$val' });
    assert.ok(r.sql.includes('ATAN('));
  });

  it('$atan2 should generate ATAN2(y, x)', () => {
    const r = translateExpr({ $atan2: ['$y', '$x'] });
    assert.ok(r.sql.includes('ATAN2'));
  });

  it('$sinh should generate SINH()', () => {
    const r = translateExpr({ $sinh: '$val' });
    assert.ok(r.sql.includes('SINH'));
  });

  it('$cosh should generate COSH()', () => {
    const r = translateExpr({ $cosh: '$val' });
    assert.ok(r.sql.includes('COSH'));
  });

  it('$tanh should generate TANH()', () => {
    const r = translateExpr({ $tanh: '$val' });
    assert.ok(r.sql.includes('TANH'));
  });

  it('$degreesToRadians should generate RADIANS()', () => {
    const r = translateExpr({ $degreesToRadians: '$degrees' });
    assert.ok(r.sql.includes('RADIANS'));
  });

  it('$radiansToDegrees should generate DEGREES()', () => {
    const r = translateExpr({ $radiansToDegrees: '$radians' });
    assert.ok(r.sql.includes('DEGREES'));
  });
});

// ==========================
// $sampleRate
// ==========================
describe('$sampleRate expression', () => {
  it('should generate RANDOM() comparison', () => {
    const r = translateExpr({ $sampleRate: 0.5 });
    assert.ok(r.sql.includes('RANDOM()'));
  });
});

// ==========================
// BSON Timestamp parts
// ==========================
describe('BSON Timestamp part expressions', () => {
  it('$tsSecond should extract high 32 bits', () => {
    const r = translateExpr({ $tsSecond: '$ts' });
    assert.ok(r.sql.includes('>> 32'));
  });

  it('$tsIncrement should extract low 32 bits', () => {
    const r = translateExpr({ $tsIncrement: '$ts' });
    assert.ok(r.sql.includes('4294967295'));
  });
});

// ==========================
// $setWindowFields stage
// ==========================
describe('$setWindowFields stage', () => {
  it('should generate window functions with PARTITION BY and ORDER BY', () => {
    const at = new AggregateTranslator('sales', null);
    const result = at.translate([{
      $setWindowFields: {
        partitionBy: '$state',
        sortBy: { orderDate: 1 },
        output: {
          cumulativeQuantity: {
            $sum: '$quantity',
            window: { documents: ['unbounded', 'current'] }
          }
        }
      }
    }]);
    assert.ok(result.sql.includes('PARTITION BY'));
    assert.ok(result.sql.includes('ORDER BY'));
    assert.ok(result.sql.includes('SUM'));
    assert.ok(result.sql.includes('UNBOUNDED PRECEDING'));
    assert.ok(result.sql.includes('CURRENT ROW'));
  });

  it('should handle $rank', () => {
    const at = new AggregateTranslator('scores', null);
    const result = at.translate([{
      $setWindowFields: {
        partitionBy: '$gameId',
        sortBy: { score: -1 },
        output: {
          rankResult: { $rank: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('RANK()'));
    assert.ok(result.sql.includes('DESC'));
  });

  it('should handle $denseRank', () => {
    const at = new AggregateTranslator('scores', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { score: -1 },
        output: {
          dr: { $denseRank: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('DENSE_RANK()'));
  });

  it('should handle $documentNumber', () => {
    const at = new AggregateTranslator('items', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { _id: 1 },
        output: {
          rowNum: { $documentNumber: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('ROW_NUMBER()'));
  });

  it('should handle $avg window function', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          movingAvg: {
            $avg: '$value',
            window: { documents: [-2, 0] }
          }
        }
      }
    }]);
    assert.ok(result.sql.includes('AVG'));
    assert.ok(result.sql.includes('ROWS BETWEEN'));
    assert.ok(result.sql.includes('2 PRECEDING'));
  });

  it('should handle $min and $max window functions', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { ts: 1 },
        output: {
          runningMin: { $min: '$val' },
          runningMax: { $max: '$val' }
        }
      }
    }]);
    assert.ok(result.sql.includes('MIN'));
    assert.ok(result.sql.includes('MAX'));
  });

  it('should handle $count window function', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        partitionBy: '$category',
        output: {
          totalInCategory: { $count: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('COUNT(*)'));
    assert.ok(result.sql.includes('PARTITION BY'));
  });

  it('should handle $shift with positive offset (LEAD)', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          nextValue: { $shift: { output: '$value', by: 1, default: 0 } }
        }
      }
    }]);
    assert.ok(result.sql.includes('LEAD'));
  });

  it('should handle $shift with negative offset (LAG)', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          prevValue: { $shift: { output: '$value', by: -1 } }
        }
      }
    }]);
    assert.ok(result.sql.includes('LAG'));
  });

  it('should handle compound partitionBy', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        partitionBy: { region: '$region', dept: '$department' },
        sortBy: { salary: -1 },
        output: {
          salaryRank: { $rank: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('PARTITION BY'));
    // Should have two partition expressions
    assert.ok(result.sql.includes('region'));
    assert.ok(result.sql.includes('department'));
  });

  it('should handle no partitionBy (whole collection as one partition)', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { ts: 1 },
        output: {
          rowNum: { $documentNumber: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('ROW_NUMBER()'));
    assert.ok(!result.sql.includes('PARTITION BY'));
  });

  it('should handle range-based window frame', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { position: 1 },
        output: {
          nearby: {
            $sum: '$val',
            window: { range: [-10, 10] }
          }
        }
      }
    }]);
    assert.ok(result.sql.includes('RANGE BETWEEN'));
  });

  it('should handle multiple output fields', () => {
    const at = new AggregateTranslator('t', null);
    const result = at.translate([{
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          cumSum: { $sum: '$amount' },
          rowNum: { $documentNumber: {} }
        }
      }
    }]);
    assert.ok(result.sql.includes('SUM'));
    assert.ok(result.sql.includes('ROW_NUMBER()'));
    // Should have nested jsonb_set calls
    const setCount = (result.sql.match(/jsonb_set/g) || []).length;
    assert.ok(setCount >= 2);
  });
});
