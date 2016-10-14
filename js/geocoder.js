var geocoder;
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

  geocoder.geocode(
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
      $('#geocodingErrorModal').find('.modal-geocoder').text(geocoder.provider);
      $('#geocodingErrorModal').find('.modal-more-info').text('It said: "' + status + '" when given address "' + app.address + '".');
      $('#geocodingErrorModal').modal();
      app.ui.resetSearchBtns();
    });
};



// Reverse geocode to get address from lat/lng
// Given: lat and lng as floats.
app.reverseGeocode = function (callback) {
  geocoder.geocode(
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

  if (!Date.now) { // shim for IE <= 8
    Date.now = function now() {
      return new Date().getTime();
    };
  }

  var googleDistanceService = (function() {

    var googleDistanceService = {
      // provider: 'Google',

      initialize: function() {
        if (typeof google === 'undefined') {
          app.util.log('Warning: Google library not loaded; distance lookups may fail.');
        } else {
          googleDistanceService._newService();
          googleDistanceService.pauseUntil = 0; // not yet throttled
        }
      },

      _newService: function () {
        googleDistanceService.service = new google.maps.DistanceMatrixService();
      },

      // getRouteDistance : app.LatLng origin, app.LatLng destination, function callback
      getRouteDistance: function (originCoords, destinationCoords, success, failure) {

        if (typeof google === 'undefined') {
          failure('Google library not loaded; cannot perform distance lookup.');
          return;
        } else if (typeof googleDistanceService.service === 'undefined') {
          googleDistanceService._newService();
        }
        if (Date.now() < googleDistanceService.pauseUntil) { // still throttled
          failure('Distance Matrix limit reached; pausing requests for a while.');
          return;
        }

        app.util.log('API call to Google Distance Matrix.');
        googleDistanceService.service.getDistanceMatrix(
          {
            origins: [new google.maps.LatLng(originCoords)],
            destinations: [new google.maps.LatLng(destinationCoords)],
            travelMode: google.maps.TravelMode.BICYCLING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
          },
          function processDistanceResponse(response, status) {
            if (status === google.maps.DistanceMatrixStatus.OVER_QUERY_LIMIT) {
              // when under massive load, prevent sending more requests for a while.
              app.util.log('Hit query limit; throttling down requests.');
              var hour = 1000 /*millisec*/ * 60 /*sec*/ * 60 /*min*/;
              googleDistanceService.pauseUntil = Date.now() + 12 * hour;
            }
            if (status !== google.maps.DistanceMatrixStatus.OK) {
              failure('Failed to fetch route distance; error was: ' + status);
            } else {

              var results = response.rows[0].elements;

              if (results[0].status === 'ZERO_RESULTS') {
                failure('No results; Google Data Matrix service says: ' + results[0].status);
              } else {

                // construct generic results
                var distance = {
                  kilometers: results[0].distance.text.split(' ')[0],
                  meters:     results[0].distance.value,
                  minutes:    results[0].duration.text.split(' ')[0],
                  seconds:    results[0].duration.value
                };

                // send to callback
                success(distance);
              }
            }
          }
        );
      },
    };

    googleDistanceService.initialize();

    return googleDistanceService;
  }());

  var mapboxDistanceService = (function() {

    var distanceService = {
      // provider: 'Mapbox',
      pauseUntil: 0, // not yet throttled

      // getRouteDistance : find distance between origin and destination, calling success or failure afterwards
      // origin: app.LatLng
      // destination: app.LatLng
      // success: function (distance : {kilometers, meters, minutes, seconds})
      // failure: function (error message : string)
      getRouteDistance: function (originCoords, destinationCoords, success, failure) {

        if (Date.now() < distanceService.pauseUntil) { // still throttled
          failure('Distance Matrix limit reached; pausing requests for a while.');
          return;
        }

        // problem: distance API only gives durations (seconds), not distances
        // Distance API docs: https://www.mapbox.com/api-documentation/#distance
        // Directions API docs: https://www.mapbox.com/api-documentation/?language=cURL#directions
        // Directions API response has time in seconds and distance in meters

        // Semicolon-separated list of  {longitude},{latitude} coordinate pairs to visit in order;
        var coordinates = originCoords.lngLatString() + ';' + destinationCoords.lngLatString();
        var url = 'https://api.mapbox.com' +
                  '/directions/v5/mapbox/cycling/' +
                  encodeURIComponent(coordinates) +
                  '.json?access_token=' + app.config.geocoder.mapboxToken;

        var start = Date.now();

        app.util.log('API call: ' + url);
        $.ajax({
          dataType: 'json',
          url: url,
          statusCode: {
            429 : function(jqxhr /*,textStatus, error*/) {
              // Mapbox APIs have rate limits that cap the number of requests that can be made
              // against an endpoint. If you exceed a rate limit, your request will be throttled
              // and you will receive HTTP 429 Too Many Requests responses from the API.
              // Header  Description
              // x-rate-limit-interval Length of rate-limiting interval in seconds.
              // x-rate-limit-limit  Maximum number of requests you may make in the current interval before reaching the limit.
              // x-rate-limit-reset  Unix timestamp of when the current interval will end and the ratelimit counter is reset.
              // https://www.mapbox.com/api-documentation/#rate-limits


              // var limitInterval = jqxhr.getResponseHeader('x-rate-limit-interval');
              var remaining = jqxhr.getResponseHeader('x-rate-limit-limit');
              var resetTimestamp = jqxhr.getResponseHeader('x-rate-limit-reset');

              app.util.log('Looks like we have ' + remaining + ' requests allowed until ' +
                Date(resetTimestamp) + '.');

              if (remaining <= 0) {
                distanceService.pauseUntil = resetTimestamp;
                // when under massive load, prevent sending more requests for a while.
                app.util.log('Hit query limit; throttling down requests.');
              }
            }
          }
        }).done(function( json ) {
          var time = Date.now() - start;
          app.util.log('Fetched Mapbox distance/directions results in ' + time + ' milleseconds:');
          app.util.log(json);
          if (!json.routes) {
            failure('No Mapbox distance/directions results; Response said ' + json.code + ': ' + json.message);
            return;
          }

          // construct generic results
          var result = json.routes[0];
          var distance = {
            kilometers: (result.distance / 1000).toFixed(1), // "0.1" km rather than 0.123
            meters:     result.distance,
            minutes:    Math.ceil(result.duration / 60), // 3 minutes rather than 2.4
            seconds:    result.duration
          };
          success(distance);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ', ' + error;
          failure('Distance Matrix request Failed: ' + err );
        });
      },
    };

    return distanceService;
  }());


  var googleGeocoder = (function() {

    var googleGeocoder = {
      provider: 'Google',

      // run geocoder for a given address (or reverse geocode on a coordinate pair),
      // and call success({address,lat,lng,results}) or failure(error_message) callback after
      geocode: function (options, success, failure) {
        console.log(googleGeocoder.provider + ' geocoding: ');
        console.log(options);

        googleGeocoder.service.geocode(options, function (results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            if (results[0]) {
              success({
                address: results[0].formatted_address,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
                results: results
              });
              return;
            } else {
              failure('no results');
              return;
            }
          } else {
            failure(status);
            return;
          }
        });
      },

      initialize: function() {
        googleGeocoder.service = new google.maps.Geocoder();

        var inputs = $('input[data-geocode-autocomplete]');
        $.each(inputs, function () {
          var autocomplete = new google.maps.places.Autocomplete(this, {
            types: ['geocode'],
            componentRestrictions: {
              country: app.config.geocoder.country
            }
          });
          var circle = new google.maps.Circle({
            center: app.config.geocoder.center,
            radius: 50000
          });
          autocomplete.setBounds(circle.getBounds());
        });
      }
    };

    googleGeocoder.initialize();
    return googleGeocoder;
  }());

  var mapboxGeocoder = (function() {

    var config = app.config.geocoder;
    var paramToken = 'access_token=' + config.mapboxToken;
    var paramCountry = config.country ? '&country=' + config.country : '';
    var paramCenter = config.center ? '&proximity=' + encodeURIComponent(config.center.lng + ',' + config.center.lat) : '';
    var paramBBox = config.bbox ? '&bbox=' + encodeURIComponent(config.bbox) : '';

    var mapboxGeocoder = {
      provider: 'Mapbox',
      urlBase: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
      urlEnd: '.json?' + paramToken +
        paramCountry +
        paramCenter +
        paramBBox +
        '&types=address' +
        '&autocomplete=true',

      cache: {},

      geocode: function (options, success, failure) {
        console.log(mapboxGeocoder.provider + ' geocoding: ');
        console.log(options);

        var query;
        if (options.address) {
          query = options.address;
        } else if (options.latLng) {
          query = options.latLng.lng + ',' + options.latLng.lat;
          // https://www.mapbox.com/api-documentation/#geocoding
        } else {
          app.util.log('unexpected geocode attempt with options: ');
          app.util.log(options);
          failure('invalid parameters');
          return;
        }

        var json = this.cache[query];
        if (json) { // skip duplicated geocoder queries

          console.log('Using cached geocoder results for query "' + query + '".');
          success(json);

        } else {

          var queryFragment = encodeURIComponent(query);
          var url = this.urlBase + queryFragment + this.urlEnd;

          var that = this;

          var start = Date.now();

          app.util.log('Sending geocoder request for "' + query + '"');

          // TODO: how to handle rate limit http 429 response?
          $.getJSON(url)
            .done(function( data ) {
              var time = Date.now() - start;
              console.log('geocoder gives these results in ' + time + ' milleseconds:');
              console.log(data);
              that.cache[query] = data;
              success(data);

              var haveResponses = typeof data.features !== 'undefined' && data.features.length > 0;
              if (haveResponses) {
                success({
                  lng: data.features[0].center[0], // longitude = x
                  lat: data.features[0].center[1], // latitude = y
                  address: data.features[0].place_name, // address or place name
                  results: data
                });
                return;
              }
            })
            .fail(function( jqxhr, textStatus, error ) {
              var err = textStatus + ', ' + error;
              app.util.log('Geocode request Failed: ' + err );
              failure(err);
            });

        }

      },

      autocompleter: function (request, response) {
        // a source function suitable for jQuery UI's autocompleter
        var $input = $(this.element);

        // update search input with any results we received
        var processResults = function (data) {
          var autocompleteResponses = [];
          var haveResponses = false;
          data.features.forEach(function (feature) {
            autocompleteResponses.push({value: feature.place_name, feature: feature});
            haveResponses = true;
          });
          if (haveResponses) {
            // show suggestions
            response(autocompleteResponses);
          } else {
            $input.autocomplete('close');
          }
        };

        mapboxGeocoder.geocode({address: request.term}, processResults);
      },

      initialize: function () {

        // monkey patch autocomplete so it highlights matches
        // http://stackoverflow.com/a/2436493/1024811
        $.ui.autocomplete.prototype._renderItem = function( ul, item) {
          var re = new RegExp('^' + this.term, 'i') ;
          var t = item.label.replace(re,'<span style="font-weight:bold;color:black;">' +
                  '$&' +
                  '</span>');

          var suggestion = $( '<li></li>' )
              .data( 'item.autocomplete', item )
              .append( '<a>' + t + '</a>' )
              .appendTo( ul );
          return suggestion;
        };


        var $inputs = $('input[data-geocode-autocomplete]');
        $inputs.autocomplete({
          minLength: 4,
          delay: 200, // pause after typing, in millesecond, before searching
          source: this.autocompleter,
          // change: function( event, ui ) {
          //   console.log('autocomplete change');
          //   console.log(ui);
          // }
        });

        // for development, show keystroke timing
        $inputs.keydown(function keydownHandler() {
          var now = Date.now();
          var last = mapboxGeocoder.lastKeyTimestamp;
          if (last) {
            app.util.log('time (ms) since last address input: ' + (now - last));
          }
          mapboxGeocoder.lastKeyTimestamp = now;
        });
      }
    };

    mapboxGeocoder.initialize();
    return mapboxGeocoder;
  }());



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


  // geocoder = mapboxGeocoder;
  geocoder = googleGeocoder;

  var distanceCache = new app.DistanceCache();
  // build a function that takes the same parameters as the other (mapbox/google) route distance functions by
  // pre-filling the parameters that are unique to getCachedRouteDistance()
  var cachingRouteDistanceFn = _.partial(getCachedRouteDistance, distanceCache, mapboxDistanceService.getRouteDistance);
  // var cachingRouteDistanceFn = _.partial(getCachedRouteDistance, distanceCache, googleDistanceService.getRouteDistance);

  app.geo.getRouteDistance = cachingRouteDistanceFn;

});