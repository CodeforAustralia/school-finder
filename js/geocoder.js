var geocoder;
app = app || {};

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




// Geocode the address in the text field, then run the callback function
app.geocodeAddress = function (callback) {
  var addressField = document.getElementById('address');
  app.address = addressField.value;
  if ($(addressField).data('coords')) {

    // TODO why isn't this always working?

    // use coordinates from previous geocoder autocomplete
    var coords = $(addressField).data('coords');
    app.lng = coords[0];
    app.lat = coords[1];
    callback();
  } else {

    // Mapbox
    geocoder.geocode({ 'address': app.address}, function saveGeocoderResults(data) {

      app.util.log('Processing geocoder results:');
      var haveResponses = typeof data.features !== 'undefined' && data.features.length > 0;
      data.features.forEach(function (feature) {
        app.util.log(feature);
      });
      if (haveResponses) {
        app.lng = data.features[0].center[0]; // longitude = x
        app.lat = data.features[0].center[1]; // latitude = y

        callback();
      } else {
        app.util.log('geocoder returned no results');
        $('#geocodingErrorModal').find('.modal-geocoder').text(geocoder.provider);
        $('#geocodingErrorModal').find('.modal-more-info').text('It gave no results when given address "' + app.address + '".');
        $('#geocodingErrorModal').modal();
        app.ui.resetSearchBtns();
      }
    });

    // Google
    // geocoder.geocode({ 'address': app.address}, function (results, status) {
    //   if (status === google.maps.GeocoderStatus.OK) {

    //     // TODO update for mapbox

    //     app.lat = results[0].geometry.location.lat();
    //     app.lng = results[0].geometry.location.lng();

    //     callback();

    //   } else {
    //     app.util.log('geocoder returned status not OK');
    //     $('#geocodingErrorModal').find('.modal-geocoder').text(geocoder.provider);
    //     $('#geocodingErrorModal').find('.modal-more-info').text('It said: "' + status + '" when given address "' + app.address + '".');
    //     $('#geocodingErrorModal').modal();
    //     app.ui.resetSearchBtns();
    //   }
    // });
  // }

  }
};



// Reverse geocode to get address from lat/lng
// Given: lat and lng as floats.
app.reverseGeocode = function (callback) {
  // var lat = app.lat;
  // var lng = app.lng;

  // mapbox
  geocoder.geocode({'latLng': {lat:app.lat, lng:app.lng}}, function (data) {
    if (data.features && data.features.length) {
      app.address = data.features[0].place_name;
      document.getElementById('address').value = app.address;
      console.log('Found address: ' + app.address);
    } else {
      console.error('No results found');
    }

    callback();
  });

  // google
  // var latlng = new google.maps.LatLng(lat, lng);
  // geocoder.geocode({'latLng': latlng}, function (results, status) {
  //   if (status === google.maps.GeocoderStatus.OK) {
  //     if (results[0]) {
  //       app.address = results[0].formatted_address;
  //       document.getElementById('address').value = app.address;
  //       console.log('Found address: ' + app.address);
  //     } else {
  //       console.error('No results found');
  //     }
  //   } else {
  //     console.error('Geocoder failed due to: ' + status);
  //   }

  //   callback();
  // });
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

      getRouteDistance: function (originCoords, destinationCoords, callback) {

        if (typeof google === 'undefined') {
          throw new Error('Google library not loaded; cannot perform distance lookup.');
        } else if (typeof googleDistanceService.service === 'undefined') {
          googleDistanceService._newService();
        }
        if (Date.now() < googleDistanceService.pauseUntil) { // still throttled
          throw new Error('Distance Matrix limit reached; pausing requests for a while.');
        }

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
              throw new Error('Failed to fetch route distance; error was: ' + status);
            } else {

              var results = response.rows[0].elements;

              if (results[0].status === 'ZERO_RESULTS') {
                throw new Error('No results; Google Data Matrix service says: ' + results[0].status);
              } else {

                // construct generic results
                var distance = {
                  kilometers: results[0].distance.text.split(' ')[0],
                  meters:     results[0].distance.value,
                  minutes:    results[0].duration.text.split(' ')[0],
                  seconds:    results[0].duration.value
                };

                // send to callback
                callback(distance);
              }
            }
          }
        );
      },
    };

    googleDistanceService.initialize();

    return googleDistanceService;
  }());

  var mapboxGeocoder = (function() {

    var config = app.config.geocoder;
    var paramToken = 'access_token=' + config.mapboxToken;
    var paramCountry = config.country ? '&country=' + config.country : '';
    var paramCenter = config.center ? '&proximity=' + encodeURIComponent(config.center.lng + ',' + config.center.lat) : '';
    var paramBBox = config.bbox ? '&bbox=' + encodeURIComponent(config.bbox) : '';

    var mapboxGeocoder = {
      provider: 'Mapbox-x',
      urlBase: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
      urlEnd: '.json?' + paramToken +
        paramCountry +
        paramCenter +
        paramBBox +
        '&types=address' +
        '&autocomplete=true',

      cache: {},

      geocode: function (options, callback) {
        console.log('mapbox geocoding: ');
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
          return;
        }

        var json = this.cache[query];
        if (json) { // skip duplicated geocoder queries

          console.log('Using cached geocoder results for query "' + query + '".');
          callback(json);

        } else {

          var queryFragment = encodeURIComponent(query);
          var url = this.urlBase + queryFragment + this.urlEnd;

          var that = this;

          var start = Date.now();

          app.util.log('Sending geocoder request for "' + query + '"');

          $.getJSON(url)
            .done(function( json ) {
              var time = Date.now() - start;
              console.log('geocoder gives these results in ' + time + ' milleseconds:');
              console.log(json);
              that.cache[query] = json;
              callback(json);
            })
            .fail(function( jqxhr, textStatus, error ) {
              var err = textStatus + ', ' + error;
              app.util.log('Request Failed: ' + err );
              // TODO modal popup
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
          change: function( event, ui ) {
            console.log('autocomplete change');
            console.log(event);
            console.log(ui);
            var coords = (ui.item && ui.item.feature) ? ui.item.feature.center : false;
            $(event.target).data('coords', coords);
          }
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


  geocoder = mapboxGeocoder;
  app.geo.getRouteDistance = googleDistanceService.getRouteDistance;

});