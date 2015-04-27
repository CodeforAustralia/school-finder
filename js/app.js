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

    if (!rows || rows.length < 1) { return; }

    app.listView.update(app.schools);
    app.mapView.update(app.schools);
    app.schoolView.update(app.schools);

    // usually (with just one result) we'll want to skip right to the map
    if (app.schools.schools.length === 1) {
      app.ui.scrollTo('.cartodb-map');
    } else {
      // but sometimes we'll need to let the user pick from multiple results
      app.ui.scrollTo('.results-list');
    }

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

    var lat = app.lat;
    var lng = app.lng;


    // Find schools whose catchment area serves a specific point
    var q = new app.Query();
    // Sometimes a single school will have multiple catchment areas,
    // one for primary level, one for secondary level.
    // See: SELECT * FROM dec_schools as s WHERE (SELECT count(*) from catchments WHERE school_code = s.school_code) > 1
    // So we have to check school_type on the *catchment*, not level_of_schooling on the *school*.
    q.byCatchment(lat, lng).addFilter("catchment_level", app.level).setSupport(app.support_needed);
    q.run(function (data) {
      if (data.rows.length < 1) {
        // this location isn't within any catchment area.
        // Try searching for schools within a distance of searchRadius, returning
        // the nearest X results (where X is default from app.Query).
        var q2 = new app.Query();
        q2.byDistance(lat, lng, app.config.searchRadius);
        q2.setSchoolType(app.level);
        q2.setSupport(app.support_needed);
        q2.run(function (data) {
          console.log(data);
          if (data.rows.length < 1) {
            app.ui.resetSearchBtns();

            // populate modal, then show it
            var html = app.modalNoResultsTemplate({support_needed: app.support_needed});
            var $el = $('#modal-container');
            $el.empty();
            $el.append(html);
            $('#noResultsForAddressModal').modal();
            $('#noResultsForAddressModal').on('hidden.bs.modal', function () {
              if (app.support_needed) {
                console.log('searching again, this time sans support');
                app.support_needed = false;
                $('.block-support select').val('no');
                $("#button-search-address").click();
              }
            });
          }
          updateUI(data.rows);
        });
      } else {
        updateUI(data.rows);
      }
    });
  };


  $(document).ready(function () {

    app.modalNoResultsTemplate = Handlebars.compile($("#modal-no-result-template").html());

    var clickSchoolType = function (e) {
      e.preventDefault();
      app.level = e.data.level;
      // jump to the address search
      $(".block-support").show();
      // $(".block-address").show();
      $('html, body').animate({
        scrollTop: $(".block-support").offset().top - 100 //HACK to center in window.
      }, 500);
    };

    var clickSupport = function (e) {
      e.preventDefault();
      var support_option = $(this).closest('.block-support').find('option:selected').val();

      app.support_needed = !(support_option === 'no');
      if (app.support_needed) {
        app.support = support_option;
      }

      $(".block-address").show();
      $('html, body').animate({
        scrollTop: $(".block-address").offset().top - 100 //HACK to center in window.
      }, 500);
    };

    $(".btn.primary").click({level: 'primary'}, clickSchoolType);
    $(".btn.secondary").click({level: 'secondary'}, clickSchoolType);


    $(".block-support .search").click(clickSupport);

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