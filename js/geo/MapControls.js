
(function (app) {

  // Primary / Secondary (PS) levels key
  var LegendPS = function () {
    var legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.innerHTML = '<div style="border:solid; border-width: 1px; border-color: #c1c1c1; background-color: #FFFFFF; padding:5px; border-radius: 5px;">' +
    '  <span style="background: rgba(254, 154, 46, 0.25); border:solid; border-width: 2px; padding:1px; width:30px; border-color: #FE9A2E;">&nbsp;&nbsp;&nbsp;</span>' +
    '  <span style="padding:1px; width:100%;">Primary</span></p>' +
    '  <span style="background: rgba(11, 97, 56, 0.25); border:solid; border-width: 2px; padding:1px; width:30px; border-color: #0B6138;">&nbsp;&nbsp;&nbsp;</span>' +
    '  <span style="padding:1px; width:100%;">Secondary</span>' +
    '</div>';
    return legend;
  };


  // Filter Schools
  var SchoolsFilter = function () {
    var controlUI = document.createElement('div');
    controlUI.className = 'nearby-schools-control leaflet-bar';

    controlUI.appendChild(this.nearbySchoolsHeaderControl());
    controlUI.appendChild(optionControl('checkbox', 'school-filters', 'all', 'nearby-schools-show', 'nearby-schools-show', 'Show nearby schools', false, onNearbySchoolsClick));
    controlUI.appendChild(this.schoolFiltersControl());

    this.container = controlUI;

    // return controlUI;
  };


  var filters = {
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
      {label: "Selective option", name: "selective", sql: "s.selective_school IN ('Partially Selective', 'Fully Selective')", matchLabel: "This school offers an academically selective option.", mismatchLabel: "Not offered: academically selective option.", matchTest: function (s) { return s.selective_school === 'Partially Selective' || s.selective_school === 'Fully Selective'; }},
      {label: "Intensive English option", name: "intensive_english", sql: "s.intensive_english_centre ", matchLabel: "This school has an Intensive English Centre.", mismatchLabel: "Not offered: Intensive English Centre.", matchTest: function (s) { return s.intensive_english_centre == true; }},
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
  };


  // helpers independent of other SchoolFilter bits

  var nearbySchoolsFeature = function () {
    var div = document.createElement('div');
    div.className = 'nearby-schools-feature';

    div.appendChild(selectPrimaryFeature());

    div.appendChild(selectSecondaryFeature());

    return div;
  };

  var selectPrimaryFeature = function () {
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'primary';

    var legend = document.createElement('legend');
    legend.innerHTML = 'With feature:';
    fieldset.appendChild(legend);

    fieldset.appendChild(optionControl('radio', 'feature', 'any', 'nearby-any', 'feature-primary', 'Any', (typeof app.state.nearby.filterFeatureForType[app.state.nearby.type] === 'undefined' || app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'any'), radioClick));
    fieldset.appendChild(optionControl('radio', 'feature', 'oshc', 'nearby-oshc', 'feature-primary', 'Outside School Hours Care', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'oshc': false, radioClick));
    fieldset.appendChild(optionControl('radio', 'feature', 'oc', 'nearby-oc', 'feature-primary', 'Opportunity Classes', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'oc': false, radioClick));

    return fieldset;
  };

  var selectSecondaryFeature = function () {

    var fieldset = document.createElement('fieldset');
    fieldset.className = 'secondary';

    var legend = document.createElement('legend');
    legend.innerHTML = 'With feature:';
    fieldset.appendChild(legend);

    fieldset.appendChild(optionControl('radio', 'feature', 'any', 'nearby-any2', 'feature', 'Any', (typeof app.state.nearby.filterFeatureForType[app.state.nearby.type] === 'undefined' || app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'any'), radioClick));
    var boysGirls = optionControl('radio', 'feature', 'boys', 'nearby-boys', 'feature', 'Boys', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'boys': false, radioClick);
    boysGirls = optionControl('radio', 'feature', 'girls', 'nearby-girls', 'feature', 'Girls', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'girls': false, radioClick, boysGirls);
    fieldset.appendChild(boysGirls);
    fieldset.appendChild(optionControl('radio', 'feature', 'selective', 'nearby-selective', 'feature', 'Academically selective option', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'selective': false, radioClick));
    fieldset.appendChild(optionControl('radio', 'feature', 'intensive_english', 'nearby-intensive_english_centre', 'feature', 'Intensive English Centre', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'nearby-intensive_english_centre': false, radioClick));
    fieldset.appendChild(optionControl('radio', 'feature', 'specialty', 'nearby-specialty', 'feature', 'Specialty option', app.state.nearby.filterFeatureForType[app.state.nearby.type] ?  app.state.nearby.filterFeatureForType[app.state.nearby.type].name == 'nearby-specialty': false, radioClick));

    return fieldset;
  };

  var selectOption = function (value, text, selected) {
    var option = document.createElement("option");
    option.value = value;
    option.text = text;
    option.selected = selected;
    return option;
  };

  var optionsFeature = function () {
    var div = document.createElement('div');
    div.className = 'nearby-schools-options';

    var fieldset = document.createElement('fieldset');
    fieldset.className = 'primary secondary nearby-schools-options';

    var legend = document.createElement('legend');
    legend.innerHTML = 'Options:';
    fieldset.appendChild(legend);

    fieldset.appendChild(optionControl('checkbox', 'option primary', 'infants', 'nearby-infants', 'nearby-infants', 'Include Infant (K-2)', app.state.nearby.othersForType[app.state.nearby.type] == 'infants', nearbyCheckboxClick));
    fieldset.appendChild(optionControl('checkbox', 'option primary secondary', 'central', 'nearby-central', 'nearby-central', 'Include Central/Community (K-12)', app.state.nearby.othersForType[app.state.nearby.type] == 'central', nearbyCheckboxClick));

    div.appendChild(fieldset);

    return div;
  };

  var optionControl = function (type, className, value, id, name, labeltext, checked, onClick, parent) {

    var container;
    if (parent) {
      container = parent;
    } else {
      container = document.createElement('div');
      container.className = className;
    }

    var control = document.createElement('input');
    control.checked = checked;
    control.type = type;
    control.value = value;
    control.id = id;
    control.name = name;
    if (onClick)
      control.addEventListener("click", onClick);
    container.appendChild(control);

    var label = document.createElement('label');
    label.htmlFor = id;
    label.innerHTML = labeltext;
    container.appendChild(label);

    return container;
  };




  var onNearbySchoolsClick = function () {
    var userWantsNearbyShown = $(this).is(':checked'); //is checked now, meaning it was unchecked before click.
    app.state.showNearby = userWantsNearbyShown;
    app.mapView.loadNearby();
  };

  var radioClick = function () {
    var featureName = $(this).attr('value');
    console.log('doing stuff for feature: ' + featureName);
    var type = app.state.nearby.type;
    var feature = _.find(filters[type].features, function (feature) {
      return feature.name === featureName;
    });
    console.log(feature);
    if (feature) {
      app.state.nearby.filterFeatureForType[type] = feature;
    }
    app.mapView.updateResultsPopups();
    app.mapView.loadNearby();
  };

  var nearbyCheckboxClick = function () {
    var type = $(this).attr('value');
    var includeThis = $(this).is(':checked');
    var others = app.state.nearby.othersForType[app.state.nearby.type];

    if (includeThis) {
      app.state.nearby.othersForType[app.state.nearby.type] = _.union(others, type);
    } else { // unchecked; remove this type
      app.state.nearby.othersForType[app.state.nearby.type] = _.without(others, type);
    }

    app.mapView.loadNearby();
  };



  SchoolsFilter.prototype = {

    nearbySchoolsHeaderControl: function () {
      var toggleUI = document.createElement('div');
      toggleUI.className = 'nearby-schools-control-toggle';

      var labelUI = document.createElement('label');
      labelUI.htmlFor = 'nearby-schools-control-expand';
      labelUI.innerHTML = 'Nearby schools';
      toggleUI.appendChild(labelUI);

      var buttonUI = document.createElement('button');
      buttonUI.className = 'toggle-filters';
      buttonUI.title = 'Expand';

      buttonUI.addEventListener('click', $.proxy(this.toggleFilterVisibility, this));
      buttonUI.id = 'nearby-schools-control-expand';

      var spanUI = document.createElement('span');

      var iUI = document.createElement('span');
      iUI.className = 'fa fa-caret-left';
      spanUI.appendChild(iUI);
      buttonUI.appendChild(spanUI);
      toggleUI.appendChild(buttonUI);

      return toggleUI;
    },

    schoolFiltersControl: function () {
      var div = document.createElement('div');
      div.className = 'school-filters';

      div.appendChild(this.schoolTypeControl());
      div.appendChild(nearbySchoolsFeature());
      div.appendChild(optionsFeature());

      return div;
    },

    schoolTypeControl: function () {
      var label = document.createElement('label');
      label.htmlFor = 'nearby-schools-type';
      label.innerHTML = 'Type:';

      var selectList = document.createElement("select");
      selectList.id = "nearby-schools-type";
      selectList.className = 'styled-select type-filter';
      selectList.addEventListener('change', this.getNearbySchoolsFilterOnChange());

      var optgroup = document.createElement("optgroup");
      optgroup.label = 'General:';
      selectList.appendChild(optgroup);

      selectList.appendChild(selectOption('all', 'All', app.state.nearby.type == 'all'));
      selectList.appendChild(selectOption('primary', 'Primary', app.state.nearby.type == 'primary'));
      selectList.appendChild(selectOption('secondary', 'Secondary', app.state.nearby.type == 'secondary'));
      selectList.appendChild(selectOption('ssp', 'Schools for Specific Purposes', app.state.nearby.type == 'ssp'));

      optgroup = document.createElement('optgroup');
      optgroup.label = 'Specific:';
      selectList.appendChild(optgroup);

      selectList.appendChild(selectOption('distance', 'Distance / Online', app.state.nearby.type == 'distance'));
      selectList.appendChild(selectOption('central', 'Central / Community (K-12)', app.state.nearby.type == 'central'));
      selectList.appendChild(selectOption('infants', 'Infant (K-2)', app.state.nearby.type == 'infants'));
      selectList.appendChild(selectOption('other', 'Other', app.state.nearby.type == 'other'));

      return selectList;
    },

    toggleFilterVisibility: function () {
      app.state.nearby.showFilters = !app.state.nearby.showFilters;
      if (app.state.showNearby == null)
        app.state.showNearby = true;
      if (app.state.showNearby)
        app.mapView.loadNearby();
      $("#nearby-schools-show").prop("checked", app.state.showNearby);
      this.update();
    },

    getNearbySchoolsFilterOnChange: function () {
      var that = this;
      return function () {
        var selected = $('option:selected', this);
        if (selected.length > 0) {
          var type = $('option:selected', this)[0].value;
          console.log("Type selected: " + type);
          app.state.nearby.type = type;

          app.mapView.updateResultsPopups();
          that.updateFilterUI();
          that.updateOptionsUI();
          app.mapView.loadNearby();
        }
      };
    },

    update: function () {
      var container = this.container;

      // setup initial UI state based on app state
      $('#nearby-schools-type', container).val(app.state.nearby.type);
      this.updateFilterUI();

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

      this.updateOptionsUI();
    },

    updateFilterUI: function () {
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

    updateOptionsUI: function () {
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


  }; // end prototype definition



  // export our defined functions
  app.M.MapLegendPS = LegendPS;
  app.M.MapControlSchoolsFilter = SchoolsFilter;

}(app));
