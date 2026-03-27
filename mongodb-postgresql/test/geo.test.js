'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { QueryTranslator } = require('../lib/queryTranslator');

describe('Geospatial query operators', () => {
  describe('$geoWithin', () => {
    it('should generate ST_Within with $geometry', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
            }
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('ST_GeomFromGeoJSON'));
    });

    it('should handle $centerSphere', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({
        location: {
          $geoWithin: {
            $centerSphere: [[-73.97, 40.77], 0.01]
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('ST_Buffer'));
      assert.ok(where.includes('geography'));
      // Radius should be converted to meters
      assert.ok(params.some(p => typeof p === 'number' && p > 60000));
    });

    it('should handle $center', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $geoWithin: {
            $center: [[0, 0], 5]
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('ST_Buffer'));
    });

    it('should handle $box', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $geoWithin: {
            $box: [[-10, -10], [10, 10]]
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('ST_MakeEnvelope'));
    });

    it('should handle $polygon', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({
        location: {
          $geoWithin: {
            $polygon: [[0, 0], [5, 0], [5, 5], [0, 5]]
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('ST_GeomFromGeoJSON'));
      // Polygon GeoJSON is in params, not in the SQL string
      assert.ok(params.some(p => typeof p === 'string' && p.includes('Polygon')));
    });

    it('$polygon should auto-close ring', () => {
      const t = new QueryTranslator();
      const { params } = t.translateFilter({
        location: {
          $geoWithin: {
            $polygon: [[0, 0], [5, 0], [5, 5]]
          }
        }
      });
      // The GeoJSON param should have the first point repeated at the end
      const geojsonParam = params.find(p => typeof p === 'string' && p.includes('Polygon'));
      const parsed = JSON.parse(geojsonParam);
      const ring = parsed.coordinates[0];
      assert.deepStrictEqual(ring[0], ring[ring.length - 1]);
    });
  });

  describe('$geoIntersects', () => {
    it('should generate ST_Intersects', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        area: {
          $geoIntersects: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
            }
          }
        }
      });
      assert.ok(where.includes('ST_Intersects'));
      assert.ok(where.includes('ST_GeomFromGeoJSON'));
    });
  });

  describe('$near', () => {
    it('should generate ST_DWithin with $geometry and $maxDistance', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [-73.97, 40.77] },
            $maxDistance: 1000
          }
        }
      });
      assert.ok(where.includes('ST_DWithin'));
      assert.ok(params.includes(1000));
    });

    it('should handle $minDistance', () => {
      const t = new QueryTranslator();
      const { where, params } = t.translateFilter({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [0, 0] },
            $minDistance: 100,
            $maxDistance: 5000
          }
        }
      });
      assert.ok(where.includes('ST_DWithin'));
      assert.ok(where.includes('ST_Distance'));
      assert.ok(where.includes('>='));
      assert.ok(params.includes(100));
      assert.ok(params.includes(5000));
    });

    it('should generate TRUE when no distance constraints', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [0, 0] }
          }
        }
      });
      assert.ok(where.includes('TRUE'));
    });
  });

  describe('$nearSphere', () => {
    it('should use geography cast for spherical distance', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [-73.97, 40.77] },
            $maxDistance: 5000
          }
        }
      });
      assert.ok(where.includes('ST_DWithin'));
      assert.ok(where.includes('geography'));
    });

    it('should handle $minDistance on sphere', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [0, 0] },
            $minDistance: 500,
            $maxDistance: 10000
          }
        }
      });
      assert.ok(where.includes('ST_DWithin'));
      assert.ok(where.includes('ST_Distance'));
      assert.ok(where.includes('geography'));
    });
  });

  describe('nested geo field', () => {
    it('should handle dot notation for geo field', () => {
      const t = new QueryTranslator();
      const { where } = t.translateFilter({
        'address.location': {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
            }
          }
        }
      });
      assert.ok(where.includes('ST_Within'));
      assert.ok(where.includes('address'));
      assert.ok(where.includes('location'));
    });
  });
});

describe('Geospatial index creation', () => {
  const { Collection } = require('../lib/collection');

  function createMockCol() {
    const queries = [];
    const pool = {
      query: async (sql) => { queries.push(sql); return { rows: [], rowCount: 0 }; }
    };
    const db = { _client: { _pool: pool }, _dbName: 'test', _schemaName: 'test', _getPool: () => pool };
    const col = new Collection(db, 'places');
    col._queries = queries;
    return { col, queries };
  }

  it('should create GIST index for 2dsphere', async () => {
    const { col, queries } = createMockCol();
    await col.createIndex({ location: '2dsphere' });
    const indexQuery = queries.find(q => q.includes('INDEX') && !q.includes('GIN'));
    assert.ok(indexQuery);
    assert.ok(indexQuery.includes('USING GIST'));
    assert.ok(indexQuery.includes('ST_GeomFromGeoJSON'));
  });

  it('should create GIST index for 2d', async () => {
    const { col, queries } = createMockCol();
    await col.createIndex({ coords: '2d' });
    const indexQuery = queries.find(q => q.includes('GIST'));
    assert.ok(indexQuery);
    assert.ok(indexQuery.includes('ST_GeomFromGeoJSON'));
  });

  it('should return expected index name', async () => {
    const { col } = createMockCol();
    const name = await col.createIndex({ location: '2dsphere' });
    assert.strictEqual(name, 'location_2dsphere');
  });
});
