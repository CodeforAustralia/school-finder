app = app || {};

(function () {

  app.geo.google = {
    DistanceService: (function() {

      var googleDistanceService = {
        // provider: 'Google',

        initialize: function() {
          if (typeof google === 'undefined') {
            app.util.log('Warning: Google library not loaded; distance lookups may fail.');
          } else {
            googleDistanceService._newService();
            googleDistanceService.pauseUntil = 0; // not yet throttled
          }

          return googleDistanceService;
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

      return googleDistanceService;
    }()),

    Geocoder: (function() {

      var googleGeocoder = {
        provider: 'Google',

        // run geocoder for a given address (or reverse geocode on a coordinate pair),
        // and call success({address,lat,lng,results}) or failure(error_message) callback after
        geocode: function (options, success, failure) {

          var geocoderOptions;
          if (options.address) {
            // extend with additional options for address based searches (restrict by country etc)
            geocoderOptions = _.extend({}, options, googleGeocoder.options);
          } else if (options.latLng) {
            // google reverse geocoder doesn't take additional restrictions as above
            geocoderOptions = {'location': options.latLng};
          }
          app.util.log(googleGeocoder.provider + ' geocoding: ');
          app.util.log(geocoderOptions);

          googleGeocoder.service.geocode(geocoderOptions, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
              if (results[0]) {
                success({
                  address: results[0].formatted_address,
                  lat: results[0].geometry.location.lat(),
                  lng: results[0].geometry.location.lng(),
                  results: _.map(results,
                    function (result) {
                      return {
                        address: result.formatted_address,
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                      };
                    })
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

        // converts to object format similar to that returned by our app.google.Geocoder
        // inputStr: the text of the input field
        // placeResult: a google.maps.places.PlaceResult
        _convertGooglePlaceToAppGeocoderResult: function (inputStr, placeResult) {
          return {
            address: inputStr, // or place.formatted_address, ?
            lat: placeResult.geometry.location.lat(),
            lng: placeResult.geometry.location.lng(),
            results: [ // some duplication, yeah. :-/
              {
                address: inputStr,
                lat: placeResult.geometry.location.lat(),
                lng: placeResult.geometry.location.lng(),
              }
            ]
          };
        },

        initialize: function() {
          googleGeocoder.service = new google.maps.Geocoder();

          // Geocoder API uses `componentRestrictions` & `bounds` options
          // https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingRequests

          googleGeocoder.options = {};
          if (app.config.geocoder.country) {
            googleGeocoder.options.componentRestrictions = {
              country: app.config.geocoder.country
            };
          }
          if (app.config.geocoder.center) {
            googleGeocoder.options.bounds = new google.maps.Circle({
              center: app.config.geocoder.center,
              radius: 50000 // meters
            }).getBounds();
          }

          // Places JS API (AutocompleteOptions) uses `componentRestrictions` & `bounds` options
          // (same as Geocoder API) plus the `types` option which should be either
          // ['geocode'] or ['address'], see https://developers.google.com/places/supported_types#table3
          // https://developers.google.com/maps/documentation/javascript/reference#AutocompleteOptions

          var autocompleteOptions = _.extend({}, googleGeocoder.options);
          autocompleteOptions.types = ['address']; // or ['geocode'];

          $('input[data-geocode-autocomplete]').each(function () {
            var input = this;
            var autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);

            google.maps.event.addListener(autocomplete, 'place_changed', function() {
              var place = autocomplete.getPlace();

              // cache this place in the geocoder results,
              // as a place search should be at least as accurate as any geocoding result
              app.geocoder.cacheResult(
                input.value,
                googleGeocoder._convertGooglePlaceToAppGeocoderResult(input.value, place)
              );

              app.util.log('Place input:', input.value);
              app.util.log('Google Place:', place);
              app.util.log('Place coordinates:', {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              });
            });

          });

          return googleGeocoder;
        }
      };

      return googleGeocoder;
    }())
  };

}());
