app = app || {};

// some queries (distance to user, etc) aren't possible if no user location known
app.error = app.error || {};
app.error.NO_USER_LOCATION = 'NO_USER_LOCATION';

// Set up a Geocoder service and attach it to the address input field.

// Geo service(s) should provide the following:
// * Forward geocoding (address -> lat/lng)
// * Reverse gecoding (lat/lng -> address)
// * autocomplete
// * network distance

// A generic lat/lng object
// Both Leaflet and Google maps accept {lat: number, lng:number} objects
app.LatLng = function (lat,lng) {

  // if (typeof this !== app.LatLng) {
  //   return new app.LatLng(lat,lng);
  // }

  // if user accidentally omits the new keyword, this will
  // silently correct the problem...
  if ( !(this instanceof app.LatLng) )
    return new app.LatLng(lat,lng);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid Lat/Lng parameters: "' + lat + '", "' + lng + '"');
  }

  this.lat = +lat;
  this.lng = +lng;
};

// return string in format: {longitude},{latitude}
app.LatLng.prototype.lngLatString = function () {
  return '' + this.lng + ',' + this.lat;
};


// If the user has searched by address, this should return true.
app.haveUserLocation = function () {
  return app.lat && app.lng;
};



// Geocode the address in the text field, then run the callback function
app.geocodeAddress = function (callback) {
  var addressField = document.getElementById('address');
  app.address = addressField.value;

  app.geocoder.geocode(
    {'address': app.address},
    function success(data) {

      app.util.log('Processing geocoder results:');
      app.util.log(data.results);

      app.lng = data.lng;
      app.lat = data.lat;
      app.address = data.address;

      callback();
    },
    function failure (error) {
      app.util.log('geocoder failed: ' + error);
      $('#geocodingErrorModal').find('.modal-geocoder').text(app.geocoder.provider);
      $('#geocodingErrorModal').find('.modal-more-info').text('It said: "' + status + '" when given address "' + app.address + '".');
      $('#geocodingErrorModal').modal();
      app.ui.resetSearchBtns();
    });
};



// Reverse geocode to get address from lat/lng
// Given: lat and lng as floats.
app.reverseGeocode = function (callback) {
  app.geocoder.geocode(
    {'latLng': {lat:app.lat, lng:app.lng}},
    function success(data) {
      app.address = data.address;
      document.getElementById('address').value = app.address;
      app.util.log('Found address: ' + app.address);
      callback();
    },
    function failure(error) {
      app.util.log('Reverse geocode lat,lng (' + app.lat + ',' + app.lng +') failed: ' + error);
    });
};

// Distance cache stores distances between any two points A and B
// where each of those are geographic coordinates with latitude and longitude.
// Note that because distances can differ depending on the direction (think: one way streets),
// the cache will store distance from A -> B separately from distance from B -> A.
// There should only be one distance cache for the application (otherwise, what's the point?)
app.DistanceCache = function () {

  // if user accidentally omits the new keyword, this will
  // silently correct the problem...
  if ( !(this instanceof app.DistanceCache) )
    return new app.DistanceCache();

  this.cache = {};
};


// retrieve the distance from origin to destination
// origin might usually be, like, the user's location and destination might be, say, a school.
// origin & destination are of type app.LatLng
// returns falsy if cache doesn't contain the distance
app.DistanceCache.prototype.get = function (originCoords, destinationCoords) {
  var cachedValue = false,
      key1 = originCoords.lngLatString(),
      key2 = destinationCoords.lngLatString();

  if (this.cache[key1]) {
    cachedValue = this.cache[key1][key2];
  }

  return cachedValue;
};


// save the distance from origin to destination
app.DistanceCache.prototype.set = function (originCoords, destinationCoords, distance) {
  var key1 = originCoords.lngLatString(),
      key2 = destinationCoords.lngLatString();

  if (!this.cache[key1]) {
    this.cache[key1] = {};
  }
  this.cache[key1][key2] = distance;
};



$(function () {

  var cachingGeocoder = function (geocoder) {

    var cache = {};

    var cachingGeocoder = {

      initialize: function () { return cachingGeocoder; },

      // key should be either address:string or '<lng>,<lat>'
      cacheResult: function (key, data) {
        cache[key] = data;
      },

      geocode: function (options, success, failure) {

        var key;
        if (options.address) {
          key = options.address;
        } else if (options.latLng) {
          key = options.latLng.lng + ',' + options.latLng.lat;
        } else {
          app.util.log('unexpected geocode attempt with options: ');
          app.util.log(options);
          failure('invalid parameters');
          return;
        }

        var data = cache[key];
        if (data) { // use cached geocoder response
          app.util.log('Using cached geocoder results for query "' + key + '".');
          success(data);
        } else {
          return geocoder.geocode(
            options,
            function cacheOnSuccess(data) {
              cachingGeocoder.cacheResult(key, data);
              success(data);
            },
            failure);
        }
      }

    };

    return cachingGeocoder;

  };


  // getCachedRouteDistance: A caching layer on top of getRouteDistance.
  // Returns cached distance if availalbe, otherwise calls getRouteDistance and saves result before calling success callback.
  //
  // cache: the cache to use (should have .get and .set functions)
  // getRouteDistance: the function to get the route distance from a network API
  // origin: app.LatLng
  // destination: app.LatLng
  // success: callback function when we've got a result
  // failure: callback function when something goes wrong with request
  var getCachedRouteDistance = function (cache, getRouteDistance, originCoords, destinationCoords, success, failure) {
    app.util.log('Looking up distance between following points:');
    app.util.log(originCoords);
    app.util.log(destinationCoords);

    var routeDistance = cache.get(originCoords, destinationCoords);

    if (routeDistance) { // great, we can used a cached result.
      app.util.log('Cache returned distance: ');
      app.util.log(routeDistance);
      success(routeDistance);
      return;
    } else { // bummer, no cache. go to network.
      getRouteDistance(originCoords, destinationCoords, function (routeDistance) {
        cache.set(originCoords, destinationCoords, routeDistance);
        success(routeDistance);
        return;
      }, failure);
    }
  };

  if (app.config.geoProvider === 'mapbox') {
    app.geo.provider = app.geo.mapbox;
  } else if (app.config.geoProvider === 'google') {
    app.geo.provider = app.geo.google;
  }

  app.geocoder = cachingGeocoder(app.geo.provider.Geocoder.initialize()).initialize();

  var distanceCache = new app.DistanceCache();
  // build a function that takes the same parameters as the other (mapbox/google) route distance functions by
  // pre-filling the parameters that are unique to getCachedRouteDistance()
  var cachingRouteDistanceFn = _.partial(getCachedRouteDistance, distanceCache, app.geo.provider.DistanceService.initialize().getRouteDistance);

  app.geo.getRouteDistance = cachingRouteDistanceFn;

});