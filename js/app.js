var app, L, cartodb, google, Handlebars;
app = app || {};

(function () {

  app.sql = new cartodb.SQL({ user: app.db.user });


  app.schools = new app.Schools(); // schools results collection

  app.listView = new app.ListView(); // summary / selector to choose school if multiple results
  app.schoolView = new app.SchoolView(); // info area for one school
  app.mapView = new app.MapView(); // map of results and surrounding schools


  var updateUI = function (rows) {
    app.schools.update(rows);

    app.listView.update(app.schools);
    app.mapView.update(app.schools);
    app.schoolView.update(app.schools);

    app.ui.scrollToId('results-container');
  };


  app.findByName = function (name) {

    // Prevent people from searching for things which will result in too many responses
    if ($.inArray(name, ['public', 'school', 'high', 'central', 'infant', ' ']) !== -1) {
      $('#tooManyResultsModal .results-count').text('way too many');
      $('#tooManyResultsModal').modal();
      app.ui.resetSearchBtns();
      return;
    }

    // Find schools by name
    var q = new app.Query();
    q.byName(name).run(function (data) {
      app.ui.resetSearchBtns();
      if (data.rows.length < 1) {
        console.log("No luck; go fish!");
        $('#noResultsForNameModal').modal();
      } else if (data.rows.length > 10) {
        $('#tooManyResultsModal .results-count').text(data.rows.length);
        $('#tooManyResultsModal').modal();
      } else {
        updateUI(data.rows);
      }
    }).error(function (errors) {
      app.ui.resetSearchBtns();
      // errors contains a list of errors
      console.log("errors:" + errors);
    });
  };

  // update results for a specific lat/lng
  app.findByLocation = function () {

    // clean up any previous result
    $('#map-container .result').remove();
    $('#map-container').empty();

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
            app.ui.resetSearchBtns();
            $('#noResultsForAddressModal').modal();
          }
          updateUI(data.rows);
        });
      } else {
        updateUI(data.rows);
      }
    });
  };


  $(document).ready(function () {

    var clickSchoolType = function (e) {
      e.preventDefault();
      app.level = e.data.level;
      // jump to the address search
      $(".block-address").show();
      $('html, body').animate({
        scrollTop: $(".block-address").offset().top - 100 //HACK to center in window.
      }, 500);
    };

    $(".btn.primary").click({level: 'primary'}, clickSchoolType);
    $(".btn.secondary").click({level: 'secondary'}, clickSchoolType);


    $("#button-search-address").click(app.ui.searchBtnFunction(function () {
      // Geocode address then show results
      app.geocodeAddress(app.findByLocation);
    }));

    $("#button-search-name").click(app.ui.searchBtnFunction(function (inputText) {
      $('.block-address').hide();
      app.findByName(inputText);
    }));

    $("#address").keyup(function (event) {
      if (event.keyCode === 13) {
        $("#button-search-address").click();
      }
    });

    $("#schoolname").autocomplete({minLength: 3, delay: 700, source: app.util.schoolNameCompleter });

  });

}());