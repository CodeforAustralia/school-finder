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
          cartocss: "#" + app.db.polygons + "{polygon-fill: #FFCC00; polygon-opacity: 0.1; line-color: #FFF; line-width: 1; line-opacity: 1;}"
        },
        { // selected boundary
          sql: this.catchmentsSQL,
          cartocss: "#" + app.db.polygons + "{polygon-fill: #FF0000; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}"
        },
        { // selected school(s)
          sql: this.schoolsSQL,
          cartocss: "#" + app.db.points + " {marker-fill: #0000FF;}",
          interactivity: 'cartodb_id, level_of_schooling, school_name, phone, street'
        }
      ]
  }).addTo(map)
    .done(function (layer) {
      app.layer = layer;
      app.layers = {};
      app.layers.catchment = layer.getSubLayer(1);
      app.layers.schools = layer.getSubLayer(2);


      app.layers.schools.setInteraction(true);
      app.layers.schools
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