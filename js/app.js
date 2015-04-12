var app, L, cartodb, google, Handlebars;
app = app || {};

(function () {

  app.maps = [];
  app.sql = new cartodb.SQL({ user: app.db.user });

  var searchMethod; // 'address' or 'name';

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

    // if we're already working, our work here is done.
    if ($btn.html().indexOf('Working') !== -1) { return; }

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

    // school level may be unspecified (if just searching by school name)
    // allow for that
    var levelFilter = '';
    if (app.level) {
      levelFilter = "school_type ~* '" + app.level + "' AND ";
    }

    schoolsSQL = "SELECT * FROM " + app.db.points + " " +
                 "WHERE school_code = '" + row.school_code + "'";
    catchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + row.school_code + "'";
    var map = app.addMap(mapID, schoolsSQL, catchmentsSQL, row);

    L.marker([row.latitude, row.longitude], {icon: app.geo.resultIcon})
      .addTo(map.map)
      // note we're using a bigger offset on the popup to reduce flickering;
      // since we hide the popup on mouseout, if the popup is too close to the marker,
      // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
      // moves near the edge between the marker and popup, making the popup flicker on and off.
      .bindPopup("<b>" + row.school_name + "</b>", {offset: [0, -28]})
      .on('mouseover', app.Map.onMouseOverOut)
      .on('mouseout', app.Map.onMouseOverOut);

    if (i === 0) { scrollToMap($result); }
  };

  app.findByName = function (name) {

    // Prevent people from searching for things which will result in too many responses
    if ($.inArray(name, ['public', 'school', 'high', 'central', 'infant', ' ']) !== -1) {
      $('#tooManyResultsModal .results-count').text('way too many');
      $('#tooManyResultsModal').modal();
      resetSearchBtn();
      return;
    }

    // Find schools by name
    var q = new app.Query();
    q.byName(name).run(function (data) {
      resetSearchBtn();
      if (data.rows.length < 1) {
        console.log("No luck; go fish!");
        $('#noResultsForNameModal').modal();
      } else if (data.rows.length > 10) {
        $('#tooManyResultsModal .results-count').text(data.rows.length);
        $('#tooManyResultsModal').modal();
      } else {
        data.rows.forEach(mapRow);
      }
    }).error(function (errors) {
      resetSearchBtn();
      // errors contains a list of errors
      console.log("errors:" + errors);
    });
  };

  // update results for a specific lat/lng
  app.findByLocation = function () {

    // clean up any previous result
    $('#results-container .result').remove();
    $('#results-container').empty();
    app.maps = [];

    var lat = app.lat;
    var lng = app.lng;


    // Find schools whose catchment area serves a specific point
    var q = new app.Query();
    // Sometimes a single school will have multiple catchment areas,
    // one for primary level, one for secondary level.
    // See: SELECT * FROM dec_schools as s WHERE (SELECT count(*) from catchments WHERE school_code = s.school_code) > 1
    // So we have to check school_type on the *catchment*, not level_of_schooling on the *school*.
    q.byCatchment(lat, lng).addFilter("catchment_level", app.level);
    q.run(function (data) {
      if (data.rows.length < 1) {
        // this location isn't within any catchment area.
        // Try searching for schools within 100 KM, X nearest (where X is default from app.Query).
        var q2 = new app.Query();
        q2.byDistance(lat, lng, 100 * 1000); /* 100 * 1000 m = 100 km */
        q2.setSchoolType(app.level);
        q2.run(function (data) {
          console.log(data);
          if (data.rows.length < 1) {
            resetSearchBtn();
            $('#noResultsForAddressModal').modal();
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

    var m = new app.Map(id, schoolsSQL, catchmentsSQL, row);
    app.maps.push(m);
    return m;
  };

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
        setTimeout(function () {resetSearchBtn(); }, 200);
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
      app.geocodeAddress(app.findByLocation);

    });

    $("#address").keyup(function (event) {
      if (event.keyCode === 13) {
        $(".btn.search").click();
      }
    });


    $("#schoolnameInput").autocomplete({minLength: 3, delay: 700,
      source: function (request, response) {
        var processResults = function (data) {
          var autocompleteResponses = [];
          var haveResponses = false;
          data.rows.forEach(function (row) {
            autocompleteResponses.push({value: row.school_name});
            haveResponses = true;
          });
          if (haveResponses) {
            if (data.rows.length === 1) { // exact match found
              $("#schoolnameInput").autocomplete("close");
              $("#schoolnameInput").val(data.rows[0].school_name);
            } else {  // show suggestions
              response(autocompleteResponses);
            }
          } else {
            $("#schoolnameInput").autocomplete("close");
          }
        };

        // ask cartodb for all school names starting with the request
        // SELECT * FROM dec_schools WHERE school_name ILIKE '%sydney%'
        var query = "SELECT school_name FROM dec_schools WHERE school_name ILIKE '" + request.term + "%'";
        app.sql.execute(query).done(processResults);
      }});
  });

}());