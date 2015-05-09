var L, app;

(function () {

  L.Control.SchoolsNearby = L.Control.extend({
    options: {
      position: 'topright'
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
        '    <option value="environmental">Environmental Centre</option>' +
        '    <option value="central">Central / Community (K-12)</option>' +
        '    <option value="infants">Infant (K-2)</option>' +
        '    <option value="other">Other</option>' +
        '     </optgroup>' +
        ' </select>' +
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
        '       <input type="checkbox" id="nearby-infants" value="infants" checked>' +
        '       <label for="nearby-infants">Include Infant (K-2)</label>' +
        '     </div>' +
        '     <div class="option primary secondary">' +
        '       <input type="checkbox" id="nearby-central" value="k12" checked>' +
        '       <label for="nearby-central">Include Central/Community (K-12)</label>' +
        '     </div>' +
        '   </fieldset>' +
        ' </div>' +
        '</div>';

      app.state.nearby.showFilters = false;
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

        that._updateFilterUI(type);

        app.state.nearby.type = type;
        app.mapView.loadNearby();
      });
    },

    _toggleFilterVisibility: function () {
      app.state.nearby.showFilters = !app.state.nearby.showFilters;
      this.update();
    },

    _updateFilterUI: function (type) {
      var container = this.container;

      $(container).find('.nearby-schools-feature fieldset').hide();
      $(container).find('.nearby-schools-feature fieldset.' + type).show();

      $(container).find('.nearby-schools-options fieldset').hide();
      $(container).find('.nearby-schools-options fieldset div').hide();

      $(container).find('.nearby-schools-options fieldset.' + type).show();
      $(container).find('.nearby-schools-options fieldset div.' + type).show();
    },

    // sync UI to stored state
    update: function () {

      var container = this.container;

      // setup initial UI state based on app state
      $('#nearby-schools-type', container).val(app.state.nearby.type);
      this._updateFilterUI(app.state.nearby.type);

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
