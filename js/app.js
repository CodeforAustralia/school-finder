var app = {};
var L, cartodb, google, codeAddress;

app.db = {
  points: 'dec_open_schools_latlong', //table
  polygons: 'boys', //table
  user: 'cesensw'
};

$(document).ready(function () {

  var clickSchoolType = function (e) {
    e.preventDefault();
    app.level = e.data.level;
    // need to make sure app.layer exists. TODO
    var sql = "SELECT * FROM " + app.db.points + " WHERE level_of_schooling IN ('" + app.level + "','Other School')";
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

    $('html, body').delay(500).animate({
      scrollTop: $(document).height()
    }, 500);
  });
});

app.lookupLatLng = function (lat, lng) {
  var catchment = app.layers.catchment;
  catchment.setSQL("SELECT * FROM " + app.db.polygons + " WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326))");
  catchment.setCartoCSS("#" + app.db.polygons + "{polygon-fill: #FF0000; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}");

  var sql = new cartodb.SQL({ user: app.db.user });

  sql.execute("SELECT b.school_code, s.school_full_name, s.street, s.phone, s.school_information FROM " + app.db.polygons + " AS b JOIN " + app.db.points + " AS s ON b.school_code = s.school_code WHERE ST_CONTAINS(b.the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326))").done(function (data) {
    if (data.rows.length < 1) {
      app.layers.schools.setSQL("SELECT * FROM " + app.db.points + " WHERE 1 = 0"); //select none
      $('.school-name').text("Sorry, I don't know about any schools there.");
      $('ul.contact').hide();
      $('.school-info-intro').hide();
    } else {
      var code = data.rows[0].school_code;
      var schools = app.layers.schools;
      schools.setSQL("SELECT * FROM " + app.db.points + " WHERE school_code = '" + code + "'");
      var name = data.rows[0].school_full_name,
        address = data.rows[0].street,
        phone = data.rows[0].phone,
        url = data.rows[0].school_information;
      $('.school-name').html('<a href="' + url + '">' + name + '</a>');
      $('.school-address').text(address);
      $('.school-phone').text(phone);
      $('ul.contact').show();
      $('.school-info-intro .level').text(app.level || 'school');
      $('.school-info-intro .address').text(app.address);
      $('.school-info-intro').show();

    }
  });

  if (!app.marker) {
    app.marker = L.marker([lat, lng]).addTo(app.map);
  } else {
    app.marker.setLatLng([lat, lng]);
  }
};

function init() {

  // initiate leaflet map
  var map = new L.Map('cartodb-map', {
    center: [-33.95699447355438, 151.14483833312988],
    zoom: 8
  });

  app.map = map;

  // L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png', { //Dark
  var httpsTiles = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';
  L.tileLayer(httpsTiles, {
    attribution: 'Mapbox <a href="https://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
  }).addTo(map);

  // from 'schools' visualization
  // var layerUrl = 'http://cesensw.cartodb.com/api/v2/viz/fa94b88c-c070-11e4-969d-0e853d047bba/viz.json';
  // cartodb.createLayer(map, layerUrl)

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
        {
          sql: "SELECT * FROM " + app.db.polygons, // keep this layer, for a little background
          cartocss: "#" + app.db.polygons + "{polygon-fill: #FFCC00; polygon-opacity: 0.1; line-color: #FFF; line-width: 1; line-opacity: 1;}"
        },
        {
          sql: "SELECT * FROM " + app.db.polygons + " WHERE 1 = 0", // 1 = 0: select none, b/c I want this layer but I don't want to show anything yet.
          cartocss: "#" + app.db.polygons + "{polygon-fill: #FFCC00; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}"
        },
        {
          sql: "SELECT * FROM " + app.db.points,
          cartocss: "#" + app.db.points + " {marker-fill: #0000FF;}",
          interactivity: 'cartodb_id, level_of_schooling, school_full_name, phone, street'
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
        console.log(e.latlng); //.lng .lat
        app.lookupLatLng(e.latlng.lat, e.latlng.lng);
      });
    })
    .error(function (err) {
      //log the error
      console.error(err); // TODO: console.XYZ needs definition on some older browsers
    });
}