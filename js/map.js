var app, L, cartodb;
app = app || {};

var Map = function (mapID, schoolsSQL, catchmentsSQL, row) {
  this.mapID = mapID;
  this.schoolsSQL = schoolsSQL;
  this.catchmentsSQL = catchmentsSQL;
  this.row = row;
  this.init();
};



Map.prototype.init = function () {

  // initiate leaflet map
  var map = new L.Map(this.mapID, {
    center: [app.lat, app.lng],
    zoom: 12,
    scrollWheelZoom: false,
  });
  this.map = map;
  var that = this;

  L.tileLayer(app.geo.tiles, { attribution: app.geo.attribution }).addTo(map);

  cartodb.createLayer(map, {
    user_name: app.db.user,
    https: true,
    tiler_protocol: 'https',
    tiler_port: '443',
    sql_port: "443",
    sql_protocol: "https",
    type: 'cartodb',
    sublayers:
      [
        { // background layer; all but selected polygon, for context
          sql: "SELECT * FROM " + app.db.polygons + " WHERE school_type ~* '" + app.level + "' AND school_code != '" + this.row.school_code + "'",
          cartocss: "#" + app.db.polygons + app.geo.backgroundCSS,
        },
        { // selected boundary
          sql: this.catchmentsSQL,
          cartocss: "#" + app.db.polygons + app.geo.catchmentCSS,
        },
        { // selected school(s)
          sql: this.schoolsSQL,
          cartocss: "#" + app.db.points + app.geo.schoolCSS,
          interactivity: 'cartodb_id, level_of_schooling, school_name, phone, street'
        }
      ]
  }).addTo(map)
    .done(function (layer) {
      that.layer = layer;
      that.layers = {};
      that.layers.catchment = layer.getSubLayer(1);
      that.layers.schools = layer.getSubLayer(2);


      that.layers.schools.setInteraction(true);
      that.layers.schools
        .on('featureClick', function (e, latlng, pos, data) {
          console.log(e, latlng, pos, data);
        })
        .on('error', function (err) {
          console.log('error: ' + err);
        });


      // Let a user shift-click the map to find school districts.
      map.on('click', function (e) {
        console.log(e.latlng);
        if (e.originalEvent.shiftKey) {
          app.lat = e.latlng.lat;
          app.lng = e.latlng.lng;

          // reverse geocode to grab the selected address, then get results.
          app.reverseGeocode(app.getResults);
        }
      });

      // Let a user move the home marker to re-search at that location
      var onMarkerDragEnd = function (event) {
        var marker = event.target;
        marker.closePopup();
        app.showHomeHelpPopup = false; // keep hidden from now on.
        var ll = marker.getLatLng();
        console.log(ll);
        app.lat = ll.lat;
        app.lng = ll.lng;
        // reverse geocode to grab the selected address, then get results.
        app.reverseGeocode(app.getResults);
      };

      // add a 'home' looking icon to represent the user's location
      var icon = L.MakiMarkers.icon({icon: "building", color: "#39acc9", size: "m"});
      var marker = L.marker([app.lat, app.lng], {icon: icon, draggable: true})
                    .addTo(map)
                    .on('dragend', onMarkerDragEnd);
      if (app.showHomeHelpPopup) {
        marker.bindPopup("<b>Your location (draggable)</b>")
              .openPopup();
      }
      // that.marker = marker;

      var hasCatchment = that.row.shape_area ? true : false;
      if (hasCatchment) {
        // zoom in to show the full catchment area
        app.sql.getBounds(that.catchmentsSQL).done(function (bounds) {
          that.map.fitBounds(bounds);
        });
      } else {
        // zoom to fit selected school + user location
        var southWest = L.latLng(that.row.latitude, that.row.longitude);
        var northEast = L.latLng(app.lat, app.lng);
        map.fitBounds(L.latLngBounds(southWest, northEast), {padding: [50, 50]});
      }
    })
    .error(function (err) {
      //log the error
      console.error(err); // TODO: console.XYZ needs definition on some older browsers
    });
};