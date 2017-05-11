app = app || {};

(function () {

  app.sql = new cartodb.SQL({ user: app.db.user });

  // UI and application state.
  app.resetState = function () {

    // Start with empty / default application state
    app.state = {
      nearby: { // nearby schools app state & map control defaults
        showFilters: false,
        filterFeatureForType: { // TODO: rename to 'featureForType' to be like othersForType
          primary: { name: 'any' },
          secondary: { name: 'any' }
        },
        othersForType: {
          primary: ['infants', 'central'],
          secondary: ['central'],
        },
      },
      showNearby: null,
    };
    app.lat = null;
    app.lng = null;
    app.activeQuery = null;
    app.address = null;
  };

  app.resetState();

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

    $('.results-footer').show();

    // ensure we're not adding same handler repeatedly
    $('.results-footer-btn').off('click.results-footer-btn');
    $('.results-footer-btn').on('click.results-footer-btn', function () {
      app.util.log('clicked "new search" button');
      var target = '#search-start';
      app.ui.clearSearchInputs(); // clear inputs *before* scrolling so user doesn't see it happening
      app.ui.scrollAndCenter(target, function postScroll () {
        app.resetState();
        app.ui.reset(); // will remove map etc, *after* scrolling, so user doesn't see it happening
      });
    });

    // usually (with just one result) we'll want to skip right to the map
    if (app.schools.schools.length === 1) {
      app.ui.viewSchool(app.schools.schools[0].school_code, '.cartodb-map');
    } else {
      // but sometimes we'll need to let the user pick from multiple results
      app.ui.scrollAndCenter('.results-list');
      app.ui.resetSearchBtns();
    }

  };

  app.findBySchoolCode = function (schoolCode) {

    // Find schools by name
    var q = new app.Query();
    app.activeQuery = q;
    q.bySchoolCode(schoolCode).run(function (data) {
      app.ui.resetSearchBtns();
      if (data.rows.length < 1) {
        app.util.log('No luck; go fish!');
        $('#noResultsForNameModal').modal();
      } else {
        updateUI(data.rows);
      }
    }).error(function (errors) {
      app.ui.resetSearchBtns();
      // errors contains a list of errors
      app.util.log('errors:' + errors);
    });
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
        app.util.log('No luck; go fish!');
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
      app.util.log('errors:' + errors);
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

    // generally school level equals age level (set through the big .block-intro buttons)...
    var school_level = app.level;
    // ... but primary aged kids (K-12) can go to either Primary (K-6) or Infant (K-2) schools
    if (app.level === 'primary') {
      school_level = ['primary', 'infants'];
    }
    q.byCatchment(lat, lng).addFilter('catchment_level', school_level).setSupport(app.support_needed);

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
          app.util.log(data);
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
                app.util.log('searching again, this time sans support');
                app.support_needed = false;
                $('.block-support select').val('no');
                $('#button-search-address').click();
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

    // the very last thing we do before a reload is scroll to the top,
    // so the page always starts there once reloaded.
    // Fixes reload issue here: https://github.com/CodeforAustralia/school-finder/issues/262
    window.onunload = function() {
      window.scrollTo(0,0);

      // we also protect privacy of address field when leaving page.
      // Users should be able to use this, then navigate to another webpage,
      // then go 'back' and not have their most recent address search visible.
      $('#address').val('');
    };

    app.modalNoResultsTemplate = Handlebars.compile($('#modal-no-result-template').html());

    var clickSchoolType = function (e) {
      e.preventDefault();
      app.level = e.data.level;
      // jump to the address search
      $('.block-address').show();

      if (!app.support_needed && app.support_needed_previously) {
        app.support = app.support_previously;
        app.support_needed = app.support_needed_previously;
        $('.block-support select').val(app.support);
      }

      app.ui.scrollAndCenter('.block-address');
    };

    var clickShowSupport = function (e) {
      e.preventDefault();

      $('.block-show-support').show();
      app.ui.scrollAndCenter('.block-show-support');
    };

    var clickShowAddress = function (e) {
      e.preventDefault();

      $('.block-address').show();
      app.ui.scrollAndCenter('.block-address');
    };

    var clickSupport = function (e) {
      e.preventDefault();
      var support_option = $('#soflow').find('option:selected').val();

      app.support_needed = app.support_needed_previously = !(support_option === 'no');
      if (app.support_needed) {
        app.support = app.support_previously = support_option;
      }

      $('.block-address').show();
      app.ui.scrollAndCenter('.block-address');
    };

    $('.btn.primary').click({level: 'primary'}, clickSchoolType);
    $('.btn.secondary').click({level: 'secondary'}, clickSchoolType);

    $('.btn.show-support').click(clickShowSupport);
    $('.btn.no-support').click(clickShowAddress);

    $('.block-show-support .search').click(clickSupport);
    // $(".btn.search").click(clickShowAddress);

    $('#button-search-address').click(app.ui.searchBtnFunction(function () {
      // Geocode address then show results
      app.geocodeAddress(app.findByLocation);
    }));

    $('#button-search-name').click(app.ui.searchBtnFunction(function (inputText) {
      $('.block-address').hide();
      app.support_needed = false;
      app.support = 'no';
      app.level = '';
      $('.block-support').hide();
      app.findByName(inputText);
    }));

    // $("#address").keyup(function (event) {
    //   if (event.keyCode === 13) {
    //     app.util.log("keyup on #address, fake clicking #button-search-address");
    //     $("#button-search-address").click();
    //   }
    // });

    $('#schoolname').autocomplete({minLength: 3, delay: 700, source: app.util.schoolNameCompleter });

    // DEBUG: jump right to the map
    // $(".btn.primary").click();
    // $(".block-support .search").click();
    // $('#address').val("Newtown, NSW");
    // $("#button-search-address").click();
          
    var sel = '.m';
    var hrf = 'hr' + 'ef';
    var addM = function () {
      var a = 'mai',
          b = 'lto:',
          c = 'schoolfinder',
          at = '@',
          d = 'detco', 
          e = 'rpcomms',
          dot = '.',
          f = 'zend',
          g = 'esk',
          h = 'com',
          i = '?',
          j = 'cc',
          k = '=', 
          l = 'nsw-',
          m = 'codef',
          n = 'oraustralia',
          o = 'or',
          p = 'g',
          q = '&subject=School Finder Feedback';
      $(this).attr(hrf, a + b + c + at + d + e + dot + f + g + dot + h + i + j + k + l + c + at + m + n + dot + o + p + q);
   
      return false;
    };

    var removeM = function () {
      $(this).removeAttr(hrf);
      $(this).attr(hrf, '');
  
      return false;
    };

    if (!app.whitelabel) {
      // not whitelabel, so add our email address
      sel += 'To';
      $(sel).focus(addM);
      $(sel).focusout(removeM);

      $(sel).on('mouseenter', addM);
      $(sel).on('mouseleave', removeM);
    }

    var school_code = getUrlVars()['school_code'];
    if (school_code){
      app.findBySchoolCode(school_code);
    }
  });

}());

function getUrlVars() {
  var vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
    function(m,key,value) {
      vars[key] = value;
    });
  return vars;
}