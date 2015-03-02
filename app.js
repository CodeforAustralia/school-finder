var app = {};

function init(){

  // initiate leaflet map
  map = new L.Map('cartodb-map', {
    center: [-33.95699447355438, 151.14483833312988],
    zoom: 11
  });

  app.map = map;

  // L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png',
  L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
  }).addTo(map);

  // from 'schools' visualization
  // var layerUrl = 'http://cesensw.cartodb.com/api/v2/viz/fa94b88c-c070-11e4-969d-0e853d047bba/viz.json';

  // change the query for the first layer
  // level_of_schooling IN ('Primary School','Other School') AND
  var subLayerOptions = {
    sql: "SELECT * FROM dec_open_schools_latlong WHERE level_of_schooling IN ('Other School') AND level_of_schooling IS NOT NULL",
    cartocss: "#dec_open_schools_latlong{marker-fill: #109DCD; marker-width: 5; marker-line-color: white; marker-line-width: 0;}"
  }

  // var layerUrl = 'http://cesensw.cartodb.com/api/v2/viz/fa94b88c-c070-11e4-969d-0e853d047bba/viz.json';
  // cartodb.createLayer(map, layerUrl)
  cartodb.createLayer(map, {
    user_name: 'cesensw',
    type: 'cartodb',
    sublayers: [{
      sql: "SELECT * FROM boys", // 1 = 0: select none, b/c I want this layer but I don't want to show anything yet.
      cartocss: '#boys{polygon-fill: #FFCC00; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}'
    },
    {
      sql: "SELECT * FROM dec_open_schools_latlong",
      cartocss: '#dec_open_schools_latlong {marker-fill: #0000FF;}'
    }]
  })
  .addTo(map)
  .done(function(layer) {
    app.layer = layer;
    // layer.createSubLayer({
    //   sql: "SELECT * FROM dec_open_schools_latlong",
    //   cartocss: '#dec_open_schools_latlong {marker-fill: #0000FF;}'
    // });

    layer.getSubLayer(1).setSQL("SELECT * FROM dec_open_schools_latlong LIMIT 50");

    // Let a user click the map to find school districts.
    map.on('click', function(e) {
      console.log(e.latlng); //.lng .lat
      // layer.getSubLayer(0).setSQL("SELECT * FROM boys WHERE school_code = '8107'");
      var catchment = layer.getSubLayer(0);
      catchment.setSQL("SELECT * FROM boys WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point("+e.latlng.lng+","+e.latlng.lat+"),4326))");
      catchment.setCartoCSS("cartocss: '#boys{polygon-fill: #FF0000; polygon-opacity: 0.5; line-color: #FFF; line-width: 1; line-opacity: 1;}")
    });

    // var subLayer = layer.getSubLayer(0);
    // subLayer.set(subLayerOptions);
    // subLayer.setInteraction(true);

    // // Define which data columns are returned during interactivity
    // sublayer.setInteractivity('cartodb_id, school_full_name, level_of_schooling');
  })
  .error(function(err) {
    //log the error
    console.error(err); // TODO: console.XYZ needs definition on some older browsers
  });
}