const geocoder = require('../src/index.js')();

describe('geocoder.reverse', () => {
  it('performs reverse geocoding on a latitude and longitude', (done) => {
    geocoder.reverse(41.89, 12.49)
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

  it("resolves an empty object when a location can't be found", (done) => {
    geocoder.reverse(0, 0)
      .then(function(result) {
        expect(result).toEqual({});
        done();
      });
  });
});
