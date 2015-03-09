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

$(function () {
  geocoder = new google.maps.Geocoder();
  return googlePlacesInitialize();
});