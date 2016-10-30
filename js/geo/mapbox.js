app = app || {};

(function () {

  if (!Date.now) { // shim for IE <= 8
    Date.now = function now() {
      return new Date().getTime();
    };
  }

  app.geo.mapbox = {

    DistanceService: (function() {

      var distanceService = {
        // provider: 'Mapbox',
        pauseUntil: 0, // not yet throttled

        initialize: function() { return distanceService; },

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
    }()),

    Geocoder: (function() {

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
          // '&types=address' +
          '&autocomplete=true',

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

          var queryFragment = encodeURIComponent(query);
          var url = this.urlBase + queryFragment + this.urlEnd;

          var start = Date.now();

          app.util.log('Sending geocoder request for "' + query + '"');

          $.getJSON(url)
            .done(function( data ) {
              var time = Date.now() - start;
              console.log('geocoder gives these results in ' + time + ' milleseconds:');
              console.log(data);

              var haveResponses = typeof data.features !== 'undefined' && data.features.length > 0;
              if (haveResponses) {
                success({
                  lng: data.features[0].center[0], // longitude = x
                  lat: data.features[0].center[1], // latitude = y
                  address: data.features[0].place_name, // address or place name
                  results: _.map(
                    data.features,
                    function (f) {
                      return {
                        lng: f.center[0],
                        lat: f.center[1],
                        address: f.place_name
                      };
                    })
                });
                return;
              }
            })
            .fail(function( jqxhr, textStatus, error ) {
              var err = textStatus + ', ' + error;
              app.util.log('Geocode request Failed: ' + err );
              failure(err);
            });
        },

        autocompleter: function (request, response) {
          // a source function suitable for jQuery UI's autocompleter
          var $input = $(this.element);

          app.geocoder.geocode( // note we call app's geocoder so to use caching if possible
            {address: request.term},
            function success(data) {
              response(_.map(data.results, function transform(result) {
                return {value: result.address};
              }));
            },
            function failure () {
              $input.autocomplete('close');
            });
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
            delay: 0, // pause after typing, in millesecond, before searching
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

          return mapboxGeocoder;
        }
      };

      return mapboxGeocoder;
    }())

  };

}());
