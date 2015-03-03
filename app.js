var app = {};
var L, cartodb, google, codeAddress;

$(document).ready(function () {

  var clickSchoolType = function (e) {
    e.preventDefault();
    // need to make sure app.layer exists. TODO
    var sql = "SELECT * FROM dec_open_schools_latlong WHERE level_of_schooling IN ('" + e.data.level + "','Other School')";
    app.layers.schools.setSQL(sql);
    console.log(sql);
    $('html, body').animate({
      scrollTop: $(".block-address").offset().top
    }, 500);
  };

  $(".btn.primary").click({level: 'Primary School'}, clickSchoolType);
  $(".btn.secondary").click({level: 'Secondary School'}, clickSchoolType);

  $(".btn.search").click(function (e) {
    e.preventDefault();

    // Geocode address
    codeAddress();

    // select content at Lat/Lng

    $('html, body').animate({
      scrollTop: $("#cartodb-map").offset().top
    }, 500);
  });
});

function init() {

  // initiate leaflet map
  var map = new L.Map('cartodb-map', {
    center: [-33.95699447355438, 151.14483833312988],
    zoom: 11
  });

  app.map = map;

  // L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png', { //Dark
  L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
  }).addTo(map);

  // from 'schools' visualization
  // var layerUrl = 'http://cesensw.cartodb.com/api/v2/viz/fa94b88c-c070-11e4-969d-0e853d047bba/viz.json';
  // cartodb.createLayer(map, layerUrl)

  cartodb.createLayer(map, {
    user_name: 'cesensw',
    type: 'cartodb',
    sublayers:
      [
        {
          sql: "SELECT * FROM boys", // keep this layer, for a little background
          cartocss: '#boys{polygon-fill: #FFCC00; polygon-opacity: 0.1; line-color: #FFF; line-width: 1; line-opacity: 1;}'
        },
        {
          sql: "SELECT * FROM boys WHERE 1 = 0", // 1 = 0: select none, b/c I want this layer but I don't want to show anything yet.
          cartocss: '#boys{polygon-fill: #FFCC00; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}'
        },
        {
          sql: "SELECT * FROM dec_open_schools_latlong",
          cartocss: '#dec_open_schools_latlong {marker-fill: #0000FF;}',
          interactivity: 'cartodb_id, level_of_schooling, school_full_name, phone, street'
        }
      ]
  }).addTo(map)
    .done(function (layer) {
      app.layer = layer;
      app.layers = {};
      app.layers.catchment = layer.getSubLayer(1);
      app.layers.schools = layer.getSubLayer(2);
      // layer.createSubLayer({
      //   sql: "SELECT * FROM dec_open_schools_latlong",
      //   cartocss: '#dec_open_schools_latlong {marker-fill: #0000FF;}'
      // });

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
        console.log(e.latlng); //.lng .lat
        var catchment = app.layers.catchment; //layer.getSubLayer(1);
        catchment.setSQL("SELECT * FROM boys WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point(" + e.latlng.lng + "," + e.latlng.lat + "),4326))");
        catchment.setCartoCSS("#boys{polygon-fill: #FF0000; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}");

        var sql = new cartodb.SQL({ user: 'cesensw' });

        sql.execute("SELECT school_code FROM boys WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point(" + e.latlng.lng + "," + e.latlng.lat + "),4326))").done(function (data) {
          var code = data.rows[0].school_code;
          var schools = app.layers.schools;
          schools.setSQL("SELECT * FROM dec_open_schools_latlong WHERE school_code = '" + code + "'");
        });
      });
    })
    .error(function (err) {
      //log the error
      console.error(err); // TODO: console.XYZ needs definition on some older browsers
    });
}