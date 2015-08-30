var L, app;

(function () {

  L.Control.SchoolsNearby = L.Control.extend({
    options: {
      position: 'topright'
    },

    filters: {
      // all {
      //   label: "All",
      //   category: "General",
      //   // sql: 'select * from dec_schools' but also vary based on if support needed,
      // },
      primary: {
        label: "Primary",
        category: "General",
        type: "primary",
        features: [
          {label: "Any", name: "any", matchTest: function () { return true; }},
          {label: "Outside School Hours Care", name: "oshc", sql: "s.oshc = true", matchLabel: "This school offers Outside School Hours Care.", mismatchLabel: "Not offered: Outside School Hours Care.", matchTest: function (s) { return s.oshc; }},
          {label: "Opportunity Classes", name: "oc", sql: "s.opportunity_class = true", matchLabel: "This school offers opportunity classes.", mismatchLabel: "Not offered: opportunity classes.", matchTest: function (s) { return s.opportunity_class; }},
          {label: "Distance Classes", name: "distance",  sql: "(distance_education IN ('null') OR distance_education IS NULL)", matchLabel: "This is a distance school.", mismatchLabel: "Not a distance school.", matchTest: function (s) { return s.distance_education !== "false"; }},
        ],
        options: [
          {label: "Include Infant (K-2)", name: "infants", type: "infants"},
          {label: "Include Central/Community (K-12)", name: "central", type: "central"}
        ],
      },
      secondary: {
        label: "Secondary",
        category: "General",
        type: "secondary",
        features: [
          {label: "Any", name: "any"},
          {label: "Boys", name: "boys", sql: "s.gender = 'boys'", matchLabel: "This is a boys school.", mismatchLabel: "Not a boys school.", matchTest: function (s) { return s.gender === 'boys'; }},
          {label: "Girls", name: "girls", sql: "s.gender = 'girls'", matchLabel: "This is a girls school.", mismatchLabel: "Not a girls school.", matchTest: function (s) { return s.gender === 'girls'; }},
          {label: "Selective option", name: "selective", sql: "s.selective_school IN ('Partially Selective', 'Fully Selective')", matchLabel: "This school offers a selective option.", mismatchLabel: "Not offered: selective option.", matchTest: function (s) { return s.selective_school === 'Partially Selective' || s.selective_school === 'Fully Selective'; }},
          {label: "Specialty option", name: "specialty", sql: "school_specialty_type NOT IN ('Comprehensive')", matchLabel: "This school offers specialized classes", mismatchLabel: "Not offered: specialized classes.", matchTest: function (s) { return s.school_specialty_type !== 'Comprehensive'; }},
          {label: "Distance Classes", name: "distance", sql: "(distance_education IN ('null') OR distance_education IS NULL)", matchLabel: "This is a distance school.", mismatchLabel: "Not a distance schoool", matchTest: function (s) { return s.distance_education !== false; }},
        ],
        options: [
          {label: "Include Central/Community (K-12)", name: "central", type: "central"}
        ],
      },
      supported: {
        label: "Schools with special support",
        //sql = ??? ssp OR (do annoying join)
        category: "General",
        features: [
          {label: "Any", name: "any"},
          {label: "Schools for Specific Purposes"},
          {label: "Schools with support classes"}
        ],
      },
      distance: {
        label: "Distance / Online",
        category: "Specific",
        // sql: "s.distance_education != 'false'",
        type: "distance",
      },
      // environmental: {
      //   label: "Environmental Centre",
      //   category: "Specific",
      //   type: "environmental",
      // },
      k12: {
        label: "Central / Community (K-12)",
        category: "Specific",
        type: "central",
      },
      infants: {
        label: "Infant (K-2)",
        category: "Specific",
        type: "infants",
      },
      other: {
        label: "Other",
        category: "Specific",
        type: "other",
      }
    },

    onAdd: function () { // (map)
      // create the control container with a particular class name
      this.container = L.DomUtil.create('div', 'nearby-schools-control leaflet-bar');
      var container = this.container;

      container.innerHTML = ' ' +
        '<div class="nearby-schools-control-toggle">' +
        '  <input type="checkbox" id="nearby-schools-show" value="all">' +
        '  <label for="nearby-schools-show">Show nearby schools</label>' +
        '<button type="button" class="toggle-filters" aria-label="Expand" title="Expand"><span aria-hidden="true"><i class="fa fa-caret-left"></i></span></button>' +
        '</div>' +
        '<div class="school-filters">' +
        ' <label for="nearby-schools-type">Type:</label>' +
        ' <select id="nearby-schools-type" class="styled-select type-filter">' +
        '  <optgroup label="General:">' +
        '    <option value="all">All</option>' +
        '    <option value="primary">Primary</option>' +
        '    <option value="secondary">Secondary</option>' +
        '    <option value="ssp">Schools for Specific Purposes</option>' +
        '  </optgroup>' +
        '  <optgroup label="Specific:">' +
        '    <option value="distance">Distance / Online</option>' +
        // '    <option value="environmental">Environmental Centre</option>' +
        '    <option value="central">Central / Community (K-12)</option>' +
        '    <option value="infants">Infant (K-2)</option>' +
        '    <option value="other">Other</option>' +
        '     </optgroup>' +
        ' </select>' +
        ' <div class="nearby-schools-filter-explanation"></div>' +
        ' <div class="nearby-schools-feature">' +
        '   <fieldset class="primary">' +
        '     <legend>With feature:</legend>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-any" name="feature-primary" value="any" checked>' +
        '      <label for="nearby-any">Any</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-oshc" name="feature-primary" value="oshc">' +
        '      <label for="nearby-oshc">Outside School Hours Care</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-oc" name="feature-primary" value="oc">' +
        '      <label for="nearby-oc">Opportunity Classes</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-distance" name="feature-primary" value="distance">' +
        '      <label for="nearby-distance">Distance Classes</label>' +
        '     </div>' +
        '   </fieldset>' +
        '   <fieldset class="secondary">' +
        '     <legend>With feature:</legend>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-any2" name="feature" value="any" checked>' +
        '      <label for="nearby-any2">Any</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-boys" name="feature" value="boys">' +
        '      <label for="nearby-boys">Boys</label>' +
        '      <input type="radio" id="nearby-girls" name="feature" value="girls">' +
        '      <label for="nearby-girls">Girls</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-selective" name="feature" value="selective">' +
        '      <label for="nearby-selective">Selective option</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-specialty" name="feature" value="specialty">' +
        '      <label for="nearby-specialty">Specialty option</label>' +
        '     </div>' +
        '     <div class="feature">' +
        '      <input type="radio" id="nearby-distance" name="feature" value="distance">' +
        '      <label for="nearby-distance">Distance Classes</label>' +
        '     </div>' +
        '   </fieldset>' +
        ' </div>' +
        ' <div class="nearby-schools-options">' +
        '   <fieldset class="primary secondary">' +
        '     <legend>Options:</legend>' +
        '     <div class="option primary">' +
        '       <input type="checkbox" id="nearby-infants" value="infants">' +
        '       <label for="nearby-infants">Include Infant (K-2)</label>' +
        '     </div>' +
        '     <div class="option primary secondary">' +
        '       <input type="checkbox" id="nearby-central" value="central">' +
        '       <label for="nearby-central">Include Central/Community (K-12)</label>' +
        '     </div>' +
        '   </fieldset>' +
        ' </div>' +
        '</div>';

      // set defaults
      app.state.nearby.showFilters = false;
      app.state.nearby.filterFeatureForType = {};
      app.state.nearby.othersForType = {
        primary: ['infants', 'central'],
        secondary: ['central'],
      };

      this._setEventHandlers();
      this.update();

      L.DomEvent.disableClickPropagation(container);

      return container;
    },

    _setEventHandlers: function () {

      var container = this.container;
      var that = this;

      $('#nearby-schools-show', container).click(function () { // clicked 'Show nearby schools'
        var filters_is_hidden = !app.state.nearby.showFilters;
        var userWantsNearbyShown = $(this).is(':checked'); //is checked now, meaning it was unchecked before click.

        if ((filters_is_hidden && userWantsNearbyShown) ||
            (!filters_is_hidden && !userWantsNearbyShown)) {
          that._toggleFilterVisibility();
        }

        app.state.showNearby = userWantsNearbyShown;
        app.mapView.loadNearby();
      });

      $('button.toggle-filters', container).click($.proxy(this._toggleFilterVisibility, this));

      $('select#nearby-schools-type', container).change(function () {
        var type = $('option:selected', this)[0].value;
        console.log("Type selected: " + type);
        app.state.nearby.type = type;

        app.mapView.updateResultsPopups();
        that._updateFilterUI();
        that._updateOptionsUI();
        app.mapView.loadNearby();
      });


      $('input:radio', container).click(function () {
        var featureName = $(this).attr('value');
        console.log('doing stuff for feature: ' + featureName);
        var type = app.state.nearby.type;
        var feature = _.find(that.filters[type].features, function (feature) {
          return feature.name === featureName;
        });
        console.log(feature);
        if (feature) {
          app.state.nearby.filterFeatureForType[type] = feature;
        }
        app.mapView.updateResultsPopups();
        app.mapView.loadNearby();
      });

      $('.nearby-schools-options input:checkbox', container).click(function () {
        var type = $(this).attr('value');
        var includeThis = $(this).is(':checked');
        var others = app.state.nearby.othersForType[app.state.nearby.type];

        if (includeThis) {
          app.state.nearby.othersForType[app.state.nearby.type] = _.union(others, type);
        } else { // unchecked; remove this type
          app.state.nearby.othersForType[app.state.nearby.type] = _.without(others, type);
        }

        app.mapView.loadNearby();
      });
    },

    _toggleFilterVisibility: function () {
      app.state.nearby.showFilters = !app.state.nearby.showFilters;
      this.update();
    },

    _updateFilterUI: function () {
      var container = this.container,
        type = app.state.nearby.type;


      var support = app.util.support_description();
      var explanation = support && app.support_needed ? "(supporting " + support + ")" : ""; // app.support_needed
      $('.nearby-schools-filter-explanation', container).text(explanation);

      $(container).find('.nearby-schools-feature fieldset').hide();
      $(container).find('.nearby-schools-feature fieldset.' + type).show();

      $(container).find('.nearby-schools-options fieldset').hide();
      $(container).find('.nearby-schools-options fieldset div').hide();

      $(container).find('.nearby-schools-options fieldset.' + type).show();
      $(container).find('.nearby-schools-options fieldset div.' + type).show();
    },

    _updateOptionsUI: function () {
      var container = this.container,
        type = app.state.nearby.type;

      if (app.state.nearby.othersForType[type]) {
        var others = app.state.nearby.othersForType[type]; //others: things like infants, central

        $(".nearby-schools-options input:checkbox", container).prop('checked', false); // reset: uncheck everything
        others.forEach(function (otherType) {
          $("#nearby-" + otherType, container).prop('checked', true);
        });
      }
    },

    // sync UI to stored state
    update: function () {

      var container = this.container;

      // setup initial UI state based on app state
      $('#nearby-schools-type', container).val(app.state.nearby.type);
      this._updateFilterUI();

      var toggleFilterButton = $('button.toggle-filters', container)[0];
      var toggleFilterIcon = $('i', toggleFilterButton);

      if (app.state.nearby.showFilters) {
        $('.school-filters', container).show();
        toggleFilterIcon.removeClass('fa-caret-left').addClass('fa-caret-down');
        toggleFilterButton.title = "Collapse";
        toggleFilterButton.setAttribute('aria-label', toggleFilterButton.title);
      } else {
        $('.school-filters', container).hide();
        toggleFilterIcon.removeClass('fa-caret-down').addClass('fa-caret-left');
        toggleFilterButton.title = "Expand";
        toggleFilterButton.setAttribute('aria-label', toggleFilterButton.title);
      }

      this._updateOptionsUI();
    },

  });


  L.schoolsNearby = function (btnMap, btnId) {
    var newControl = new L.Control.SchoolsNearby();
    if (btnId) {
      newControl.options.id = btnId;
    }

    if (btnMap && btnMap !== '') {
      btnMap.addControl(newControl);
    }
    return newControl;
  };

}());
