var L, app;

(function () {

  L.Control.SchoolsNearby = L.Control.extend({
    options: {
      position: 'topright'
    },

    onAdd: function () { // (map)
      // create the control container with a particular class name
      var container = L.DomUtil.create('div', 'nearby-schools-control leaflet-bar');

      container.innerHTML = ' ' +
        '<div class="nearby-schools-control-toggle">' +
        '  <input type="checkbox" id="nearby-schools-show" value="all">' +
        '  <label for="nearby-schools-show">Show nearby schools</label>' +
        '<button type="button" class="expander" aria-label="Expand"><span aria-hidden="true"><i class="fa fa-caret-left"></i></span></button>' +
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

      $('#nearby-schools-show', container).click(function () { // clicked 'Show nearby schools'
        var filters_is_hidden = $('.school-filters', container).is(':hidden');
        var this_was_unchecked = $(this).is(':checked'); //is checked now, meaning it was unchecked before click.
        if (filters_is_hidden && this_was_unchecked) {
          $('.school-filters').show();
          $('button.expander', container).click();
        } else if (!filters_is_hidden && !this_was_unchecked) {
          $('.school-filters').hide();
          $('button.expander', container).click();
        }


        if (this_was_unchecked) {
          // add nearby markers to map
          // app.mapView.map.addLayer(app.mapView.nearbyMarkersGroup);
          app.state.showNearby = true;
          app.mapView.loadNearby();
        } else {
          // remove nearby markers from map
          app.state.showNearby = false;
          app.mapView.loadNearby();
        }

      });

      $('button.expander', container).click(function () {
        var icon = $('i', this);
        if (icon.hasClass('fa-caret-left')) { // expand:
          icon.removeClass('fa-caret-left').addClass('fa-caret-down');
          $('.school-filters').show();
        } else if (icon.hasClass('fa-caret-down')) { // collapse:
          icon.removeClass('fa-caret-down').addClass('fa-caret-left');
          $('.school-filters').hide();
        }
      });

      $('select#nearby-schools-type', container).change(function () {
        var type = $('option:selected', this)[0].value;
        console.log("Type selected: " + type);
        $('.nearby-schools-feature fieldset').hide();
        $('.nearby-schools-feature fieldset.' + type).show();

        $('.nearby-schools-options fieldset').hide();
        $('.nearby-schools-options fieldset div').hide();

        $('.nearby-schools-options fieldset.' + type).show();
        $('.nearby-schools-options fieldset div.' + type).show();

        app.state.nearby.type = type;
        app.mapView.loadNearby();
      });


      $('.school-filters', container).hide();
      $('.nearby-schools-feature fieldset', container).hide();
      $('.nearby-schools-options fieldset', container).hide();


      L.DomEvent.disableClickPropagation(container);

      return container;
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
