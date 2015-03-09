var app, Map, L, cartodb, google, Handlebars;
app = app || {};

app.db = {
  points: 'dec_schools', //table
  polygons: 'catchments', //table
  user: 'cesensw'
};

app.geo = {
  tiles: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  //dark: https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png'
  attribution: 'Mapbox <a href="https://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
};

app.maps = [];


$(document).ready(function () {

  var clickSchoolType = function (e) {
    e.preventDefault();
    app.level = e.data.level;
    // jump to the address search
    $('html, body').animate({
      scrollTop: $(".block-address").offset().top - 100 //HACK to center in window.
    }, 500);
  };

  $(".btn.primary").click({level: 'primary'}, clickSchoolType);
  $(".btn.secondary").click({level: 'secondary'}, clickSchoolType);

  $(".btn.search").click(function (e) {
    e.preventDefault();

    // clean up any previous result
    $('#results-container .result').remove();
    $('#results-container').empty();
    app.maps = [];

    // Geocode address then show results
    app.geocodeAddress(app.getResults);

  });

  $("#address").keyup(function (event) {
    if (event.keyCode === 13) {
      $(".btn.search").click();
    }
  });

  app.sql = new cartodb.SQL({ user: app.db.user });

});


// update results for a specific lat/lng
app.getResults = function () {
  var lat = app.lat;
  var lng = app.lng;

  app.sql.execute("SELECT b.school_code, s.school_name, s.street, s.phone FROM " + app.db.polygons + " AS b JOIN " + app.db.points + " AS s ON b.school_code = s.school_code WHERE ST_CONTAINS(b.the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326)) AND b.school_type ~* '" + app.level + "'")
    .done(function (data) {
      var context, source, template, html, mapID, schoolsSQL, catchmentsSQL;
      if (data.rows.length < 1) {
        source = $("#no-result-template").html();
        template = Handlebars.compile(source);
        html = template();
        $('#results-container').html(html);

        mapID = 'cartodb-map-blank';
        schoolsSQL = "SELECT * FROM " + app.db.points + " WHERE 1 = 0";
        app.addMap(mapID, schoolsSQL);
      } else {
        data.rows.forEach(function (row, i) {
          var resultID = "result-" + i;
          mapID = "cartodb-map-" + i;
          $('#results-container').append('<div class="result" id="' + resultID + '"></div>');

          context = {
            resultNumber: i,
            name: row.school_name,
            schoolAddress: row.street,
            phone: row.phone,
            level: app.level || 'school',
            homeAddress: app.address
          };

          source = $("#result-template").html();
          template = Handlebars.compile(source);
          html = template(context);
          var $result = $('#' + resultID);
          $result.html(html);

          schoolsSQL = "SELECT * FROM " + app.db.points + " WHERE school_code = '" + row.school_code + "'";
          catchmentsSQL = "SELECT * FROM " + app.db.polygons + " WHERE school_code = '" + row.school_code + "'";
          app.addMap(mapID, schoolsSQL, catchmentsSQL);

          // scroll to first result
          if (i === 0) {
            $('html, body').animate({
              scrollTop: $result.offset().top
            }, 500);
          }
        });
      }
    });
};


app.addMap = function (id, schoolsSQL, catchmentsSQL) {

  catchmentsSQL = catchmentsSQL || "SELECT * FROM " + app.db.polygons + " WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point(" + app.lng + "," + app.lat + "),4326)) AND school_type ~* '" + app.level + "'";

  var m = new Map(id, schoolsSQL, catchmentsSQL);
  app.maps.push(m);
};