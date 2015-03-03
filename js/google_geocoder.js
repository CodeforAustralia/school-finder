var app, geocoder, google;

var codeAddress = function () {
  var address = document.getElementById('address').value;
  geocoder.geocode({ 'address': address}, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {

      var lat = results[0].geometry.location.lat();
      var lng = results[0].geometry.location.lng();
      app.map.setView([lat, lng], 12, {animate: true});
      app.lookupLatLng(lat, lng);

    } else {
      $('#result').html('Geocode was not successful for the following reason: ' + status);
    }
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