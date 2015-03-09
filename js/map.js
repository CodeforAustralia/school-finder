var app, L, cartodb;
app = app || {};

var Map = function (mapID, schoolsSQL, catchmentsSQL) {
  this.mapID = mapID;
  this.schoolsSQL = schoolsSQL;
  this.catchmentsSQL = catchmentsSQL;
  this.init();
};


// Map.prototype.render = function () {

//   // show the points corresponding to the level selected
//   var sql = "SELECT * FROM " + app.db.points + " WHERE level_of_schooling ~* '" + app.level + "' OR level_of_schooling = 'Other School'";
//   this.layers.points.setSQL(sql);
//   console.log(sql);

//   app.lookupLatLng();
// };


Map.prototype.init = function () {

  // initiate leaflet map
  var map = new L.Map(this.mapID, {
    center: [app.lat, app.lng],
    zoom: 12
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
        { // background layer; all polygons, for context
          sql: "SELECT * FROM " + app.db.polygons,
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


      // Let a user click the map to find school districts.
      map.on('click', function (e) {
        console.log(e.latlng);
        app.lat = e.latlng.lat;
        app.lng = e.latlng.lng;
        app.getResults();
      });

      L.marker([app.lat, app.lng]).addTo(map);

      // zoom in to show the full catchment area
      app.sql.getBounds(that.catchmentsSQL).done(function (bounds) {
        that.map.fitBounds(bounds);
      });

      // if (!app.marker) {
      // } else {
      //   app.marker.setLatLng([lat, lng]);
      // }

    })
    .error(function (err) {
      //log the error
      console.error(err); // TODO: console.XYZ needs definition on some older browsers
    });
};