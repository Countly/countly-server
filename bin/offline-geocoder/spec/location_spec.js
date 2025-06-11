const geocoder = require('../src/index.js')();

describe('geocoder.location', () => {
  describe('.find', () => {
    it('performs a lookup by id', (done) => {
      geocoder.location(3169070)
        .then(function(result) {
          expect(result).toEqual({
            id: 3169070,
            name: 'Rome',
            formatted: 'Rome, Lazio, Italy',
            country: { id: 'IT', name: 'Italy' },
            admin1: { id: 7, name: 'Lazio' },
            coordinates: { latitude: 41.89193, longitude: 12.51133 },
            tz: 'Europe/Rome'
          });
          done();
        });
    });

    it("resolves undefined when a location can't be found", (done) => {
      geocoder.location(-1)
        .then(function(result) {
          expect(result).toEqual(undefined);
          done();
        });
    });
  });
});
