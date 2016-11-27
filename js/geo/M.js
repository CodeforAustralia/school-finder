// M: A single Map interface that translates to either Leaflet or Google

app.M = (function() {

  var gmapsInfowindow = null; // semi global used by Google Maps code


  function MapboxMap (mapEl, mapOptions) {
    this.map = new L.Map(mapEl, mapOptions);
    L.tileLayer(app.geo.tiles, { attribution: app.geo.attribution }).addTo(this.map);
  }

  function GoogleMap (mapEl, mapOptions) {
    this.map = new google.maps.Map(mapEl);
    this.map.setOptions(mapOptions);
  }



  // get the actual google, mapbox, etc map object
  var getActualMap = function () { return this.map; };
  MapboxMap.prototype.getActualMap = getActualMap;
  GoogleMap.prototype.getActualMap = getActualMap;



  // When the map changes (new tiles, new bounds etc), run some callback.
  // Useful for example when the user drags or zooms to view a new part of the
  // world and we need to overlay new data on the new tiles shown.
  MapboxMap.prototype.onViewChange = function (callback) {
    this.map.on('viewreset moveend', callback);
  };
  GoogleMap.prototype.onViewChange = function (callback) {
    google.maps.event.addListener(this.map, 'dragend', callback);
    google.maps.event.addListener(this.map, 'zoom_changed', callback);
  };




  // pass through map event listeners
  MapboxMap.prototype.on = function (event, callback) { this.map.on(event, callback); };
  GoogleMap.prototype.on = function (event, callback) { this.map.addListener(event, callback); };



  // markers should be a L.featureGroup
  MapboxMap.prototype.addMarkerSet = function (markers) {
    this.map.addLayer(markers);
  };

  // expects an array of markers
  GoogleMap.prototype.addMarkerSet = function (markers) {
    for (var i = 0; i < markers.length; i++) {
      var googleMarker = markers[i];
      googleMarker.marker.setMap(this.map);
    }
  };

  // markers should be a L.featureGroup
  MapboxMap.prototype.removeMarkerSet = function (markers) {
    this.map.removeLayer(markers);
  };

  // expects an array of markers; removes all markers from map
  GoogleMap.prototype.removeMarkerSet = function (markers) {
    for (var i = 0; i < markers.length; i++) {
      var googleMarker = markers[i];
      googleMarker.marker.setMap(null);
    }
  };


  // returns a map lat/lon bounds object in a format useful
  // for the cartodb sql queries: {left:__, bottom:__, right:__, top:__}
  MapboxMap.prototype.getBounds = function () {

    // leaflet format
    var mapBounds = this.map.getBounds();

    return {
      left: mapBounds.getWest(),
      bottom: mapBounds.getSouth(),
      right: mapBounds.getEast(),
      top: mapBounds.getNorth()
    };
  };

  GoogleMap.prototype.getBounds = function () {

    // google format
    var mapBounds = this.map.getBounds();

    return {
      left: mapBounds.getSouthWest().lng(),
      bottom: mapBounds.getSouthWest().lat(),
      right: mapBounds.getNorthEast().lng(),
      top: mapBounds.getNorthEast().lat()
    };
  };



  MapboxMap.prototype.fitBounds = function (bounds, options) {
    this.map.fitBounds(bounds, options);
  };

  GoogleMap.prototype.fitBounds = function (bounds /*, options */) {
    // todo update bounds based on options.padding
    app.util.log('fitbounds() w/ bounds:');
    app.util.log(bounds);
    this.map.fitBounds(bounds);
  };


  MapboxMap.prototype.updateForAccessibility = function () {

    // map tiles are meaningless to screen readers, so set alt to ""
    // otherwise, the screen reader might read just the image file's name
    // https://github.com/Leaflet/Leaflet/issues/3210#issue-56830926 says:
    // "VO spoke the filename of the images in the map's base layer,
    // speaking, "6078 dot p n g, link", "6079 dot p n g, link", and so forth."

    // https://github.com/GoogleChrome/accessibility-developer-tools/wiki/Audit-Rules#ax_text_02 says:
    // <!-- Good: image used for presentation has an empty alt value -->
    // <img src="line.png" alt="">

    $(this.map.getContainer()).find('.leaflet-tile-pane img').attr('alt', '');
  };

  GoogleMap.prototype.updateForAccessibility = function () {
    app.util.log('TODO: ensure Google Map has no images (tiles, controls etc) missing alt tags');
  };


  MapboxMap.prototype.addMapControls = function () {

    // add map control for nearby schools filter
    var mapX = this;
    L.Control.SchoolsNearby = L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: function () {
        var schoolsControl = new app.M.MapControlSchoolsFilter();
        mapX.schoolsControl = schoolsControl;
        schoolsControl.update(); // initialize
        return schoolsControl.container;
      }
    });
    var schoolsControl = new L.Control.SchoolsNearby();
    this.map.addControl(schoolsControl);


    // add map legend for school catchments key
    L.Control.Legend = L.Control.extend({
      options: {
        position: 'bottomright'
      },

      onAdd: function () {
        var mapPSLegend = new app.M.MapLegendPS();
        return mapPSLegend;
      }
    });
    var legend = new L.Control.Legend();
    this.map.addControl(legend);
  };

  // add + initialize map controls, legends etc
  GoogleMap.prototype.addMapControls = function () {

    var map = this.map;

    // add map control for nearby schools filter
    var schoolsControl = new app.M.MapControlSchoolsFilter(/*map*/);
    this.schoolsControl = schoolsControl;

    map.controls[google.maps.ControlPosition.TOP_RIGHT].clear();
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(schoolsControl.container);
    schoolsControl.update(); // initialize


    // add map legend for school catchments key
    var mapPSLegend = new app.M.MapLegendPS();
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].clear();
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(mapPSLegend);
  };


  MapboxMap.prototype.updateMapControls = function () {
    this.schoolsControl.update();
    // and skip updating primary/secondary catchment key legend - it doesn't change
  };

  GoogleMap.prototype.updateMapControls = function () {
    this.schoolsControl.update();
    // and skip updating primary/secondary catchment key legend - it doesn't change
  };


  // function MapboxMarker (latLng, options) {
  //   this.marker = new L.Marker(latLng, options);
  // }

  var GoogleIcon = function (options) {

    // we'll take the Maki icon sizes and update accordingly.
    // As of this writing, the tip of the marker icons seem to be
    // exactly centered (x & y axes) in the images, whereas Google maps
    // expects the tip of those markers to be centered along the bottom
    // of the image. We'll have to update Google's settings accordingly.
    var iconWidth = options.iconSize[0];
    var iconHeight = options.iconSize[1];

    return {
      url: options.iconUrl,
      size: new google.maps.Size(iconWidth, iconHeight),

      // The origin for this image defaults to (0, 0).
      // origin: new google.maps.Point(0, 0)

      // The tip of the marker is in exact center of image
      anchor: new google.maps.Point(iconWidth/2, iconHeight/2)

      // The position at which to anchor an image in correspondence to the location of the marker
      // on the map. By default, the anchor is located along the center point of the bottom of the image.
      // anchor: new google.maps.Point(options.popupAnchorGoogle[0], options.popupAnchorGoogle[1])
      // TODO make anchor align right.
      // anchor: new google.maps.Point(18, 45)
    };
  };

  function GoogleMarker (latLng, options) {
    this.marker = new google.maps.Marker({draggable: options.draggable});

    // this.marker.infoWindow = null;
    this.marker.setPosition(latLng);
    this.marker.setTitle(null);
    this.marker.setIcon(new GoogleIcon(options.icon.options));

    this.options = options; // so marker.options.school works.
  }

  // latLng can be a google maps LatLng or LatLngLiteral ({lat:__, lng:___})
  GoogleMarker.prototype.setLatLng = function (latLng) {
    this.marker.setPosition(latLng);
    return this;
  };

  // emulate same function in Leaflet - add a marker to a map
  GoogleMarker.prototype.addTo = function (map) {
    this.marker.setMap(map);
    return this;
  };

  // opens associated popup / info window.
  // Returns 'this', hence it's a chainable function: marker.openPopup.addTo(map);
  //
  // As per Leaflet: Opens the specified popup while closing the previously opened
  // (to make sure only one is opened at one time for usability).
  GoogleMarker.prototype.openPopup = function () {
    var marker = this.marker,
        map = marker.getMap();

    if (gmapsInfowindow) {
      // keep with Leaflet style usability - only one open at a time
      gmapsInfowindow.close();
      // Google maps doesn't seem to have an obvious way to do this other
      // than keeping track of the one infowindow
      // (see http://stackoverflow.com/a/4540249/1024811)
    }
    else {
      gmapsInfowindow = new google.maps.InfoWindow();
    }

    gmapsInfowindow.setContent(this.marker.popup);
    gmapsInfowindow.open(map, marker);

    return this;
  };

  GoogleMarker.prototype.closePopup = function () {

    if (gmapsInfowindow) {
      gmapsInfowindow.close();
    }

    // if (this.marker.infoWindow) {
    //   this.marker.infoWindow.close();
    //   this.marker.infoWindow = null;
    // }
    return this;
  };

  GoogleMarker.prototype.setPopupContent = function (content) {
    this.marker.popup = content;
    return this;
  };

  GoogleMarker.prototype.bindPopup = function (content, options) {
    app.util.log('TODO: update marker based on options.offset. options: ');
    app.util.log(options);

    this.marker.popup = content;

    // leaflet does this by default in bindPopup(); make Google do it too.
    var gMarker = this;
    this.on('click', function () { gMarker.openPopup(); });

    return this;
  };

  GoogleMarker.prototype.on = function (event, callback) { this.marker.addListener(event, callback); return this; };

  GoogleMarker.prototype.getLatLng = function () {
    // return the LatLng that google operations expect
    var latLng = this.marker.getPosition();
    return latLng;
  };


  var M = {

    // must be run before M (map library) is used.
    // map provider can be 'mapbox' or 'google'
    init: function (mapProvider) { M.provider = mapProvider; },

    classes: {
      mapbox: {
        map: MapboxMap,
        marker: L.Marker
      },
      google: {
        map: GoogleMap,
        marker: GoogleMarker
      }
    },

    map: function (mapEl, mapOptions) {
      return new M.classes[M.provider]['map'](mapEl, mapOptions);
    },

    marker: function (latLng, mapOptions) {
      return new M.classes[M.provider]['marker'](latLng, mapOptions);
    },

    // works with either Leaflet or Google markers
    // returns an object with lat and lng properties.
    getMarkerLatLng: function (marker) {
      var ll = marker.getLatLng();
      var lat, lng;
      if (typeof ll.lat === 'function') {
        lat = ll.lat();
        lng = ll.lng(); // Google LatLng uses methods
      } else {
        lat = ll.lat;
        lng = ll.lng;  // Leaflet just has properties
      }
      return app.LatLng(lat,lng);
    },

    markerSet: function (markers) {
      // take an array of markers and create a map specific set of them
      if (M.provider === 'google') {
        return markers; // simple array
      } else if (M.provider === 'mapbox') {
        return new L.featureGroup(markers);
      }
    },

    iterateMarkerSet: function (markerSet, callback) {
      if (M.provider === 'google') {
        for (var i = 0; i < this.markerSet.length; i++) {
          callback(markerSet[i]); // simple array
        }
      } else if (M.provider === 'mapbox') {
        markerSet.eachLayer(function (marker) {
          callback(marker);
        });
      }
    },


    getBounds: function (markers) {

      if (this.provider === 'google') {

        if (!markers.length) {
          app.util.log('weird: getBounds() called with empty set');
          return app.config.maxBounds;
        }

        var llBounds = new google.maps.LatLngBounds(markers[0].getLatLng());
        for (var i = 1; i < markers.length; i++) {
          llBounds.extend(markers[i].getLatLng());
        }

        var bounds = {
          east: llBounds.getNorthEast().lng(),
          north: llBounds.getNorthEast().lat(),
          south: llBounds.getSouthWest().lat(),
          west: llBounds.getSouthWest().lng()
        };
        app.util.log('getBounds() calculated bounds: ');
        app.util.log(bounds);
        return bounds;

      } else if (this.provider === 'mapbox') {
        // TODO: could we just use leaflet's static class objects to
        // calculate bounds, then convert format? We have L. as part of
        // cartoDB anyway.
        return L.featureGroup(markers).getBounds();
      }

    },

    latLngBounds: function (southWest, northEast) {

      if (this.provider === 'mapbox') {
        return new L.LatLngBounds(southWest, northEast);
      } else if (this.provider === 'google') {
        return new google.maps.LatLngBounds(southWest, northEast);
      } else {
        app.util.log('error: unknown provider: "' + this.provider + '"');
      }
    },

    // take any two latitudes, longitudes and return a bounds object
    rectifyBounds: function (lat1, lat2, lng1, lng2) {

      var swLat, swLng, neLat, neLng;

      if (lat1 > lat2) {
        swLat = lat2;
        neLat = lat1;
      } else {
        swLat = lat1;
        neLat = lat2;
      }

      if (lng1 > lng2) {
        swLng = lng2;
        neLng = lng1;
      } else {
        swLng = lng1;
        neLng = lng2;
      }

      var sw = app.LatLng(swLat, swLng);
      var ne = app.LatLng(neLat, neLng);
      // return new google.maps.LatLngBounds(sw, ne);
      return M.latLngBounds(sw, ne);

    }

  };

  return M;

}());
