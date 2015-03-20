var app, Map, L, cartodb, google, Handlebars;
app = app || {};

(function () {

  app.maps = [];
  app.sql = new cartodb.SQL({ user: app.db.user });

  var searchMethod; // 'address' or 'name';

  $(document).ready(function () {

    // Make school level buttons equal width
    var maxWidth = Math.max.apply(null, $('.block-intro .btn.school-level').map(function () {
      return $(this).outerWidth(true);
    }).get());
    $('.block-intro .btn.school-level').width(maxWidth);

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

    $("#button-search-name").click(function () {

      searchMethod = 'name';

      // Use Search button as status
      setSearchBtnToWorking();

      var name = $('.school-name-search input').val();
      console.log("looking for...");
      console.log(name);

      if (!name) {
        console.log('nothing entered to search for, not trying!');
        setTimeout(function () {resetSearchBtn();}, 200);
      } else {
        app.findByName(name);
      }
    });

    $("#button-search-address").click(function (e) {
      e.preventDefault();

      searchMethod = 'address';

      // Use Search button as status
      setSearchBtnToWorking();

      // Geocode address then show results
      app.geocodeAddress(app.getResults);

    });

    $("#address").keyup(function (event) {
      if (event.keyCode === 13) {
        $(".btn.search").click();
      }
    });
  });

  app.findByName = function (name) {

    // Find schools by name
    var query = "SELECT b.the_geom AS catchment_geom, s.* " +
                "FROM " + app.db.points + " AS s " +
                "LEFT OUTER JOIN " + app.db.polygons + " AS b " +
                "ON s.school_code = b.school_code " +
                "WHERE s.school_name ILIKE '%" + name + "%'";
    app.sql.execute(query)
      .done(function (data) {
        resetSearchBtn();
        if (data.rows.length < 1) {
          console.log("No luck; go fish!");
        } else {
          // data.rows.forEach(mapRow);
          // data.rows.forEach(function (data) {
          //   console.log("found school");
          //   console.log(data);
          // });
        }
      }).error(function(errors) {
        resetSearchBtn();
        // errors contains a list of errors
        console.log("errors:" + errors);
      });
  };

  var getSearchBtn = function () {
    var $btn;
    if (searchMethod === 'name') {
      $btn = $('#button-search-name');
    } else if (searchMethod === 'address') {
      $btn = $('#button-search-address');
    }
    return $btn;
  };

  // Reset Search button to it's default state
  var resetSearchBtn = function () {
    var $btn = getSearchBtn();
    $btn.text($btn.data('default-text')).css('background-color', $btn.data('default-bgcolor'));
  };

  // Put Search button in 'Working' (show status) state
  var setSearchBtnToWorking = function () {
    var $btn = getSearchBtn();
    $btn.data('default-text', $btn.html());
    $btn.data('default-bgcolor', $btn.css('background-color'));
    $btn.html('Working&hellip;');
    $btn.css('background-color', 'gray');
  };

  var scrollToMap = function ($result) {
    // scroll to first result
    $('html, body').animate({
      scrollTop: $result.offset().top,
    }, 500, function () {
      resetSearchBtn();
    });
  };

  var mapRow = function (row, i) {
    var context, source, template, html, mapID, schoolsSQL, catchmentsSQL;
    var resultID = "result-" + i;
    mapID = "cartodb-map-" + i;
    $('#results-container').append('<div class="result" id="' + resultID + '"></div>');

    context = app.School.toTemplateContext(row, i);
    source = $("#result-template").html();
    template = Handlebars.compile(source);
    html = template(context);
    var $result = $('#' + resultID);
    $result.html(html);

    schoolsSQL = "SELECT * FROM " + app.db.points + " WHERE school_code = '" + row.school_code + "'";
    catchmentsSQL = "SELECT * FROM " + app.db.polygons + " WHERE school_type ~* '" + app.level + "' AND school_code = '" + row.school_code + "'";
    var map = app.addMap(mapID, schoolsSQL, catchmentsSQL, row);

    // Specify a Maki icon name, hex color, and size (s, m, or l).
    // An array of icon names can be found in L.MakiMarkers.icons or at https://www.mapbox.com/maki/
    // Lowercase letters a-z and digits 0-9 can also be used. A value of null will result in no icon.
    // Color may also be set to null, which will result in a gray marker.
    var icon = L.MakiMarkers.icon({icon: "school", color: "#d72d6c", size: "m"});
    L.marker([row.latitude, row.longitude], {icon: icon})
      .addTo(map.map)
      // note we're using a bigger offset on the popup to reduce flickering;
      // since we hide the popup on mouseout, if the popup is too close to the marker,
      // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
      // moves near the edge between the marker and popup, making the popup flicker on and off.
      .bindPopup("<b>" + row.school_name + "</b>", {offset: [0, -28]})
      .on('mouseover', Map.onMouseOverOut)
      .on('mouseout', Map.onMouseOverOut);

    if (i === 0) { scrollToMap($result); }
  };

  // update results for a specific lat/lng
  app.getResults = function () {

    // clean up any previous result
    $('#results-container .result').remove();
    $('#results-container').empty();
    app.maps = [];

    var lat = app.lat;
    var lng = app.lng;


    // Find schools whose catchment area serves a specific point
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
            if (data.rows.length < 1) {
              resetSearchBtn();
              $('#noResultsModal').modal();
            }
            data.rows.forEach(mapRow);
          });
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

}());