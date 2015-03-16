var app, Map, L, cartodb, google, Handlebars;
app = app || {};

// CartoDB configuration
app.db = {
  points: 'dec_schools', //table
  polygons: 'catchments', //table
  user: 'cesensw'
};

// Map configuration variables
app.geo = {
  tiles: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  //dark: https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png'
  attribution: 'Mapbox <a href="https://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
  // CartoCSS for various map layers
  backgroundCSS: '{polygon-fill: #F0F0F0; polygon-opacity: 0; line-color: #7E599D; line-width: 0.3; line-opacity: 1; line-dasharray: 10,4;}',
  catchmentCSS: '{polygon-fill: #D0DAFF; polygon-opacity: 0.15; line-color: #426; line-width: 1; line-opacity: 1;}',
  schoolCSS: '{marker-fill: #D0DAFF;}',
};

app.maps = [];
app.config = {
  maxRuralTravel: "105000" // maximum meters someone would travel to a rural school; used to find schools w/o catchments
};
app.showHomeHelpPopup = true;

String.prototype.capitalize = String.prototype.capitalize || function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};


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

    var $btn = $(this);
    // $(e.target).html('Working&hellip;');
    $btn.data('default-text', $btn.html());
    $btn.data('default-bgcolor', $btn.css('background-color'));

    // Use Search button as status
    $btn.html('Working&hellip;');
    $btn.css('background-color', 'gray');


    // Geocode address then show results
    app.geocodeAddress(app.getResults);

  });

  $("#address").keyup(function (event) {
    if (event.keyCode === 13) {
      $(".btn.search").click();
    }
  });

  app.sql = new cartodb.SQL({ user: app.db.user });

  // Make school level buttons equal width
  var maxWidth = Math.max.apply(null, $('.block-intro .btn').map(function () {
    return $(this).outerWidth(true);
  }).get());
  $('.block-intro .btn').width(maxWidth);

});


// update results for a specific lat/lng
app.getResults = function () {

  // clean up any previous result
  $('#results-container .result').remove();
  $('#results-container').empty();
  app.maps = [];

  var lat = app.lat;
  var lng = app.lng;
  var alreadyScrolled = false;
  var scrollToMap = function ($el) {
    // scroll to first result
    if (!alreadyScrolled) {
      $('html, body').animate({
        scrollTop: $el.offset().top,
      }, 500, function () {
        // Reset Search button
        var $btn = $('.btn.search');
        $btn.text($btn.data('default-text')).css('background-color', $btn.data('default-bgcolor'));
      });
    }
  };


  var yesNo = function (field) {
    if (field && field === 'Y') {
      return 'Yes';
    }
    return 'No';
  };

  var rowToContext = function (row, i) {
    return {
      resultNumber: i,
      name: row.school_name,
      address: row.street,
      suburb: row.town_suburb,
      postcode: row.postcode,
      code: row.school_code,
      phone: row.phone,
      website: row.website,
      level: function () {
        var level;
        if (app.level) {
          level = app.level.capitalize();
        } else {
          level = 'School';
        }
        return level;
      },
      grades: row.subtype,
      selective: row.selective_school,
      specialty: row.school_specialty_type,
      preschool: yesNo(row.preschool_indicator),
      oshc: row.oshc, /* outside school hours care */
      distanceEd: row.distance_education,
      intensiveEnglish: yesNo(row.intensive_english_centre),
      established: function () {
        // try to return something human friendly if we can parse date.
        var d = new Date(row.date_1st_teacher);
        if (d) { return d.getFullYear(); }
        return row.date_1st_teacher;
      },
      email: row.school_email,
      homeAddress: app.address,
      distance: function () {

        // function roundToTwo(num) {
        //   return +(Math.round(num + "e+2")  + "e-2");
        // }

        function roundToOne(num) {
          return +(Math.round(num + "e+1")  + "e-1");
        }

        var centerLatLng = new L.latLng(app.lat, app.lng);
        var otherLatLng = new L.latLng(row.latitude, row.longitude);
        var dist = centerLatLng.distanceTo(otherLatLng);

        // lookup distance along road network and insert it into page when the results come back.
        app.calculateRouteDistance(row.latitude, row.longitude, '#result-' + i + ' .route-distance');

        return "About " + roundToOne(dist / 1000) + "km";
      }
    };
  };

  var mapRow = function (row, i) {
    var context, source, template, html, mapID, schoolsSQL, catchmentsSQL;
    var resultID = "result-" + i;
    mapID = "cartodb-map-" + i;
    $('#results-container').append('<div class="result" id="' + resultID + '"></div>');

    context = rowToContext(row, i);

    source = $("#result-template").html();
    template = Handlebars.compile(source);
    html = template(context);
    var $result = $('#' + resultID);
    $result.html(html);

    schoolsSQL = "SELECT * FROM " + app.db.points + " WHERE school_code = '" + row.school_code + "'";
    catchmentsSQL = "SELECT * FROM " + app.db.polygons + " WHERE school_type ~* '" + app.level + "' AND school_code = '" + row.school_code + "'";
    var map = app.addMap(mapID, schoolsSQL, catchmentsSQL, row);

    var onMouseOverOut = function (e) {
      var marker = e.target;
      if (e.type === 'mouseover') {
        marker.openPopup();
      } else if (e.type === 'mouseout') {
        marker.closePopup();
      }
    };

    // Specify a Maki icon name, hex color, and size (s, m, or l).
    // An array of icon names can be found in L.MakiMarkers.icons or at https://www.mapbox.com/maki/
    // Lowercase letters a-z and digits 0-9 can also be used. A value of null will result in no icon.
    // Color may also be set to null, which will result in a gray marker.
    var icon = L.MakiMarkers.icon({icon: "school", color: "#b0b", size: "m"});
    L.marker([row.latitude, row.longitude], {icon: icon})
      .addTo(map.map)
      // note we're using a bigger offset on the popup to reduce flickering;
      // since we hide the popup on mouseout, if the popup is too close to the marker,
      // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
      // moves near the edge between the marker and popup, making the popup flicker on and off.
      .bindPopup("<b>" + row.school_name + "</b>", {offset: [0, -28]})
      .on('mouseover', onMouseOverOut)
      .on('mouseout', onMouseOverOut);

    if (i === 0) { scrollToMap($result); }
  };


  app.sql.execute("SELECT b.school_code, b.shape_area, s.* FROM " + app.db.polygons + " AS b JOIN " + app.db.points + " AS s ON b.school_code = s.school_code WHERE ST_CONTAINS(b.the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326)) AND b.school_type ~* '" + app.level + "'")
    .done(function (data) {
      if (data.rows.length < 1) {
        // this location isn't within any catchment area. Try searching for schools within 100 KM (TODO)
        // currently, X nearest.
        app.sql.execute(
          "SELECT s.*, " +
            "ST_DISTANCE(s.the_geom::geography, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326)::geography) AS dist " +
            "FROM " + app.db.points + " AS s " +
            "WHERE (s.level_of_schooling ~* '" + app.level + "' OR s.level_of_schooling ~* 'central') " +
            "AND ST_DISTANCE(s.the_geom::geography, ST_SetSRID(ST_Point(" + lng + "," + lat + "),4326)::geography) < " + app.config.maxRuralTravel +
            "ORDER BY dist ASC LIMIT 5 "
        ).done(function (data) {
          console.log(data);
          data.rows.forEach(mapRow);
        });

        // source = $("#no-result-template").html();
        // template = Handlebars.compile(source);
        // html = template();
        // $('#results-container').html(html);

        // mapID = 'cartodb-map-blank';
        // schoolsSQL = "SELECT * FROM " + app.db.points + " WHERE 1 = 0";
        // app.addMap(mapID, schoolsSQL);

        // scrollToMap($('#' + mapID));

      } else {
        data.rows.forEach(mapRow);
      }
    });
};


app.addMap = function (id, schoolsSQL, catchmentsSQL, row) {

  catchmentsSQL = catchmentsSQL || "SELECT * FROM " + app.db.polygons + " WHERE ST_CONTAINS(the_geom, ST_SetSRID(ST_Point(" + app.lng + "," + app.lat + "),4326)) AND school_type ~* '" + app.level + "'";

  var m = new Map(id, schoolsSQL, catchmentsSQL, row);
  app.maps.push(m);
  return m;
};