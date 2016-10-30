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
          console.log(googleGeocoder.provider + ' geocoding: ');
          console.log(options);

          googleGeocoder.service.geocode(options, function (results, status) {
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

          return googleGeocoder;
        }
      };

      return googleGeocoder;
    }())
  };

}());
