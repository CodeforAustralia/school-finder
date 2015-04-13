var app, geocoder, google;
app = app || {};


// Geocode the address in the text field, then run the callback function
app.geocodeAddress = function (callback) {
  app.address = document.getElementById('address').value;
  geocoder.geocode({ 'address': app.address}, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {

      app.lat = results[0].geometry.location.lat();
      app.lng = results[0].geometry.location.lng();

      callback();

    } else {
      $('#results-container').html('Geocode was not successful for the following reason: ' + status);
    }
  });
};

// Reverse geocode to get address from lat/lng
// Given: lat and lng as floats.
app.reverseGeocode = function (callback) {
  var lat = app.lat;
  var lng = app.lng;
  var latlng = new google.maps.LatLng(lat, lng);
  geocoder.geocode({'latLng': latlng}, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      if (results[0]) {
        app.address = results[0].formatted_address;
        document.getElementById('address').value = app.address;
        console.log("Found address: " + app.address);
      } else {
        console.error('No results found');
      }
    } else {
      console.error('Geocoder failed due to: ' + status);
    }

    callback();
  });
};


var googlePlacesInitialize = function () {
  var inputs;
  inputs = $('input[data-google-places]');
  return $.each(inputs, function () {
    return new google.maps.places.Autocomplete(this, {
      types: ['geocode'],
      componentRestrictions: {
        country: 'au' // Australia
      }
    });
  });
};


// get the callback function for the given selector
function callBacker(selector) {

  var callback = function (response, status) {
    if (status !== google.maps.DistanceMatrixStatus.OK) {
      console.error('Failed to fetch route distance; error was: ' + status);
    } else {
      // var origins = response.originAddresses;
      // var destinations = response.destinationAddresses;
      var outputDiv = $(selector);
      // outputDiv.innerHTML = '';
       // origins[i] + ' to ' + destinations[j]
      var results = response.rows[0].elements;
      outputDiv.html(', or via roads: '
        + results[0].distance.text.split(' ').join('&nbsp;') + ' in '
        + results[0].duration.text.split(' ').join('&nbsp;') + ' cycling');
    }
  };

  return callback;
}


// calculate distance from user's location to specified location
app.calculateRouteDistance = function (lat, lng, elSelector) {
  var service = new google.maps.DistanceMatrixService();

  var origin1 = new google.maps.LatLng(app.lat, app.lng);
  // var origin2 = 'Greenwich, England';
  var destinationA = new google.maps.LatLng(lat, lng);

  service.getDistanceMatrix(
    {
      origins: [origin1],
      destinations: [destinationA],
      travelMode: google.maps.TravelMode.BICYCLING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    },
    callBacker(elSelector)
  );
};


$(function () {
  geocoder = new google.maps.Geocoder();
  return googlePlacesInitialize();
});