var app, L, cartodb, google, Mustache, navigator;
app = app || {};

(function () {

  app.sql = new cartodb.SQL({ user: app.db.user });
  app.state = {}; // UI and application state.
  app.state.nearby = {}; // info about nearby markers to display


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

    $('.new-search-btn-container').show();

    $('a.new-search').click(function (e) {
      e.preventDefault();
      var top = $('#search-start').offset().top;
      // jump just above the start but not past the top of the page
      top = (top - 30 > 0) ? top - 30 : top;
      $('body').animate({scrollTop: top}, 1000);
    });

    // usually (with just one result) we'll want to skip right to the map
    if (app.schools.schools.length === 1) {
      app.ui.scrollTo('.cartodb-map');
    } else {
      // but sometimes we'll need to let the user pick from multiple results
      app.ui.scrollAndCenter('.results-list');
      app.ui.resetSearchBtns();
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
    app.activeQuery = q;
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
    app.activeQuery = q;
    // Sometimes a single school will have multiple catchment areas,
    // one for primary level, one for secondary level.
    // See: SELECT * FROM dec_schools as s WHERE (SELECT count(*) from catchments WHERE school_code = s.school_code) > 1
    // So we have to check school_type on the *catchment*, not level_of_schooling on the *school*.
    q.byCatchment(lat, lng).addFilter("catchment_level", app.level).setSupport(app.support_needed);
    q.run(function (data) {
      if (data.rows.length < 1) {
        // this location isn't within any catchment area
        // (or w/in a catchment area of a school providing the support needed)
        // Try searching for schools within a distance of searchRadius, returning
        // the nearest X results (where X is default from app.Query).
        var types = [app.level];
        if (app.support_needed) {
          types.push('ssp');
        }
        var q2 = new app.Query();
        app.activeQuery = q2;
        q2.byDistance(lat, lng, app.config.searchRadius).setLimit(app.config.nearbyLimit);
        q2.setSupport(app.support_needed);
        q2.setSchoolType(types);
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

    var iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
    if (iOS) {
      $('html').addClass('ios');
    }

    app.modalNoResultsTemplate = Mustache.parse($("#modal-no-result-template").html());

    var clickSchoolType = function (e) {
      e.preventDefault();
      app.level = e.data.level;
      // jump to the address search
      $(".block-support").show();

      if (!app.support_needed && app.support_needed_previously) {
        app.support = app.support_previously;
        app.support_needed = app.support_needed_previously;
        $('.block-support select').val(app.support);
      }

      app.ui.scrollAndCenter('.block-support');
    };

    var clickSupport = function (e) {
      e.preventDefault();
      var support_option = $(this).closest('.block-support').find('option:selected').val();

      app.support_needed = app.support_needed_previously = !(support_option === 'no');
      if (app.support_needed) {
        app.support = app.support_previously = support_option;
      }

      $(".block-address").show();
      app.ui.scrollAndCenter('.block-address');
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
      app.support_needed = false;
      app.support = 'no';
      $('.block-support').hide();
      app.findByName(inputText);
    }));

    $("#address").keyup(function (event) {
      if (event.keyCode === 13) {
        $("#button-search-address").click();
      }
    });

    var autocompleteOptions = {
      minChars: 3,
      keyboardDelay: 300,
      onSelect: function (_ignoredElement, val) {
        $("#schoolname").val(val.title);
      }
    };

    var requestSchoolMatches = function (val) {
      this.field.trigger('beforerequest', [this, val]);

      // ask cartodb for all school names starting with the request
      // SELECT * FROM dec_schools WHERE school_name ILIKE '%sydney%'
      var query = "SELECT school_name FROM dec_schools WHERE school_name ILIKE '" + val + "%'";
      app.sql.execute(query).done($.proxy(this.beforeReceiveData, this));
    };


    // monkey patch TinyAutocomplete so we can use CartoDB's SQL API
    // to fetch the remote data
    $.tinyAutocomplete.prototype.remoteRequest =
      $.tinyAutocomplete.prototype.debounce(requestSchoolMatches, autocompleteOptions.keyboardDelay);

    /**
     * Override TinyAutocomplete's wrap function to work with bootstrap
     * @return {null}
     */
    $.tinyAutocomplete.prototype.setupMarkup = function() {
      this.field.addClass('autocomplete-field');
      this.field.attr('autocomplete', 'off');
      this.el = this.field.parent();
      this.el.addClass('autocomplete')
    };

    var autocompleteProcessData = function (_ignoredEvent, tinyAutocomplete, json) {
      // tinyAutocomplete.json is the variable that Tiny Autocomplete uses
      // for displaying the options later on
      var autocompleteResponses = [];
      var rowTransform = function (row, index) {
        autocompleteResponses.push(
          {title: row.school_name,
            "id": index+1
          });
      };
      json.rows.forEach(rowTransform);
      tinyAutocomplete.json = autocompleteResponses;
    };

    $("#schoolname").tinyAutocomplete(autocompleteOptions)
      .on('receivedata', autocompleteProcessData);


    // DEBUG: jump right to the map
    // $(".btn.primary").click();
    // $(".block-support .search").click();
    // $('#address').val("Newtown, NSW");
    // $("#button-search-address").click();

  });

}());