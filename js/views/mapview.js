var app, cartodb, Handlebars, L;
app = app || {};

(function () {

  var MapView = function () {
    this.$el = $('#map-container');
    this.template = Handlebars.compile($("#map-template").html());
  };

  app.MapView = MapView;

  MapView.filters = {
    distance: {
      sql: "(s.distance_education IN ('null') OR distance_education IS NULL)",
      icon: 'fa-ship',
      title: 'Show only distance-education options',
      id: 'filter-distance'
    },
    boys: {
      sql: "s.gender = 'boys'",
      icon: 'fa-male',
      title: 'Show only boys schools',
      id: 'filters-boys',
    },
    girls: {
      sql: "s.gender = 'girls'",
      icon: 'fa-female',
      title: 'Show only girls schools',
      id: 'filters-girls',
    },
    oshc: {
      sql: "s.oshc = true",
      icon: 'fa-child',
      title: 'Show only schools with Outside School Hours Care',
      id: 'filters-oshc'
    },
    opportunity_class: {
      sql: "s.opportunity_class = true",
      icon: 'fa-bolt',
      title: 'Show only schools with opportunity classes',
      id: 'filters-opportunity-class',
    },
    selective_school: {
      sql: "s.selective_school IN ('Partially Selective', 'Fully Selective')",
      icon: 'fa-bolt',
      title: 'Show only schools with a selective option',
      id: 'filters-selective',
    },
    specialty: {
      sql: "school_specialty_type NOT IN ('Comprehensive')",
      icon: 'fa-magic',
      title: 'Show only specialty schools',
      id: 'filters-specialty',
    },
  };


  MapView.prototype.update = function (schools) {
    this.schools = schools;
    this.render();
  };


  MapView.prototype.render = function () {

    if (!this.schools || this.schools.schools.length < 1) { return; } /* must update() w/ school list before rendering */

    if (!this.rendered) {

      var context = {};
      var html = this.template(context);

      // clean up any previous result & re-add
      // this.$el.empty();
      this.$el.append(html);
    }

    this.init();

    this.rendered = true;
  };


  MapView.onMouseOverOut = function (e) {
    var marker = e.target;
    if (e.type === 'mouseover') {
      marker.openPopup();
    } else if (e.type === 'mouseout') {
      if (!this.selectedMarker || marker !== this.selectedMarker) {
        // only auto close on mouse out if the marker hasn't been specifically selected (clicked)
        marker.closePopup();
      }
    }
  };


  // Let a user move the home marker to re-search at that location
  MapView.onMarkerDragEnd = function (event) {
    var marker = event.target;
    marker.closePopup();
    var ll = marker.getLatLng();
    console.log(ll);
    app.lat = ll.lat;
    app.lng = ll.lng;
    // reverse geocode to grab the selected address, then get results.
    app.reverseGeocode(app.findByLocation);
  };


  MapView.prototype.clickSchool = function (row) {
    var that = this;
    return function (e) {
      // open the school name popup
      var marker = e.target;
      marker.openPopup();
      that.selectedMarker = marker;

      // tell the school view to show this particular school
      app.schoolView.update(new app.School(row));
    };
  };


  MapView.prototype.clickResultSchool = function (school) {
    var that = this;
    return function (e) {

      // open the school name popup
      var marker = e.target;
      marker.openPopup();

      if (that.selectedMarker === marker) {
        return; // nothing to do
      }

      that.selectedMarker = marker;

      // select that school from the list
      app.schools.select(school.school_code);

      // update the UI
      app.listView.update();
      app.schoolView.update(app.schools.selected());

      if (that.activeResultMarker === marker) {
        // reselected already-shown result school; nothing to do
        return;
      }

      app.mapView.update(app.schools);

      app.ui.scrollTo('.cartodb-map');
    };
  };


  var getPopupForFilter = function (school, filterSQL) {
    var popup = "<b>" + school.school_name + "</b>";
    if (filterSQL === MapView.filters.distance.sql) {
      popup += "<br>This is a distance school.";
    }
    if (filterSQL === MapView.filters.boys.sql) {
      popup += "<br>This is a boys school.";
    }
    if (filterSQL === MapView.filters.girls.sql) {
      popup += "<br>This is a girls school.";
    }
    if (filterSQL === MapView.filters.opportunity_class.sql) {
      popup += "<br>This school offers opportunity classes.";
    }
    if (filterSQL === MapView.filters.oshc.sql) {
      popup += "<br>This school offers Outside School Hours Care.";
    }
    if (filterSQL === MapView.filters.selective_school.sql) {
      popup += "<br>This school offers a selective option.";
    }
    if (filterSQL === MapView.filters.specialty.sql) {
      popup += "<br>Specialty: " + school.school_specialty_type;
    }
    return popup;
  };

  // Fetch nearby schools and add them to the map for context
  MapView.prototype.loadNearby = function () {
    var that = this;
    var school = this.schools.selected();

    // get current view's bounding box
    var mapBounds = this.map.getBounds();

    // query for nearby schools
    // http://postgis.refractions.net/docs/ST_MakeEnvelope.html ST_MakeEnvelope(left, bottom, right, top, [srid]) SRID defaults to 4326
    var bounds = {
      left: mapBounds.getWest(),
      bottom: mapBounds.getSouth(),
      right: mapBounds.getEast(),
      top: mapBounds.getNorth()
    };

    var q = new app.Query();
    // If app.level is unspecified (when someone just first searched for a school by name),
    // then for now just show schools of that type (instead of all schools).
    // Later we may want to let users control which markers are visible (TODO)
    // Include SSP here in case people are looking for that (later we can add a filtering step)
    q.setSchoolType([app.level || school.type, 'ssp']).setSupport(app.support_needed)
      .where("s.school_code NOT IN (" +  _.pluck(this.schools.schools, 'school_code') + ")")
      .byBounds(bounds);
    if (this.whereFilter) { // add custom filter if it has been set
      q.where(this.whereFilter);
    }
    q.run(function (data) {
      // add schools (except this one, already added) to map
      console.log(data);
      var markers = [];
      data.rows.forEach(function (row) {
        var marker = L.marker([row.latitude, row.longitude], {icon: app.geo.nearbyIcons[row.type]})
          // note we're using a bigger offset on the popup to reduce flickering;
          // since we hide the popup on mouseout, if the popup is too close to the marker,
          // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
          // moves near the edge between the marker and popup, making the popup flicker on and off.
          .bindPopup(getPopupForFilter(row, that.whereFilter), {offset: [0, -28]})
          .on('click', that.clickSchool(row))
          .on('mouseover', MapView.onMouseOverOut, that)
          .on('mouseout', MapView.onMouseOverOut, that);
        markers.push(marker);
      });
      if (that.nearbyMarkersGroup) {
        that.map.removeLayer(that.nearbyMarkersGroup);
      }
      that.nearbyMarkersGroup = new L.featureGroup(markers);
      that.map.addLayer(that.nearbyMarkersGroup);

    });
  };


  MapView.prototype.addFilters = function () {

    var that = this;
    this.filterControls = {};

    _.each(MapView.filters, function (filter) {

      L.easyButton(filter.icon,
        function () {
          if (that.whereFilter === filter.sql) {
            that.whereFilter = undefined; // disable filter
            $('#' + this.options.id).parent().removeClass('active-filter');
          } else {
            that.whereFilter = filter.sql;
            $('.leaflet-control .active-filter').removeClass('active-filter');
            $('#' + this.options.id).parent().addClass('active-filter');
          }
          that.loadNearby();
        },
        filter.title,
        that.map,
        filter.id
        );
      $('#' + filter.id).closest('.leaflet-control').addClass(filter.id);

    });
  };


  MapView.prototype.addHomeMarker = function () {
    if (!this.map) { return; } // can't add marker if map doesn't yet exist.

    var markerLatLng;
    if (app.lat && app.lng) {
      markerLatLng = [app.lat, app.lng];
    }

    if (this.homeMarker) {
      // it's already on the map, just make sure it's in the right spot.
      if (markerLatLng) {
        this.homeMarker.setLatLng(markerLatLng);
      }
      return;
    }

    // add a 'home' looking icon to represent the user's location
    if (markerLatLng) {
      this.homeMarker = L.marker(markerLatLng, {icon: app.geo.homeIcon, draggable: true})
                    .addTo(this.map)
                    .on('dragend', MapView.onMarkerDragEnd)
                    .bindPopup("<b>Your location (draggable)</b>");
    }
  };


  MapView.prototype.fitBounds = function () {
    if (!this.map) { return; } // can't zoom on a map doesn't yet exist.
    var that = this;

    var school = this.schools.selected();
    var hasCatchment = school.shape_area ? true : false;
    if (hasCatchment) {
      // zoom in to show the full catchment area
      app.sql.getBounds(this.catchmentsSQL).done(function (bounds) {
        that.map.fitBounds(bounds);
      });
    } else if (app.lat && app.lng) {
      // zoom to fit selected school + user location
      var southWest = L.latLng(school.latitude, school.longitude);
      var northEast = L.latLng(app.lat, app.lng);
      this.map.fitBounds(L.latLngBounds(southWest, northEast), {padding: [50, 50]});
    } else {
      // no school catchment & no user location, so just zoom to the school's location
      this.map.panTo([school.latitude, school.longitude]);
    }
  };


  MapView.prototype.init = function () {
    var that = this;

    // TODO: don't re-render if we click the already-selected school

    var school = this.schools.selected();

    // school level may be unspecified (if just searching by school name)
    // allow for that
    var levelFilter = '';
    if (app.level) {
      levelFilter = "school_type ~* '" + app.level + "' AND ";
    }

    this.catchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + school.school_code + "'";
    this.otherCatchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code != '" + school.school_code + "'";


    // initiate leaflet map
    var map;
    if (!this.map) { // create map for first time

      // center on either user's location or selected school
      var center = null;
      if (app.lat && app.lng) {
        center = [app.lat, app.lng];
      } else if (school.latitude && school.longitude) {
        center = [school.latitude, school.longitude];
      }

      var mapEl = this.$el.find(":first")[0];
      map = new L.Map(mapEl, {
        center: center,
        zoom: 12,
        scrollWheelZoom: false,
      });
      this.map = map;

      map.on('viewreset moveend', function () {
        that.loadNearby();
      });

      L.tileLayer(app.geo.tiles, { attribution: app.geo.attribution }).addTo(map);

      cartodb.createLayer(map, {
        user_name: app.db.user,
        https: true,
        tiler_protocol: 'https',
        tiler_port: '443',
        sql_port: "443",
        sql_protocol: "https",
        type: 'cartodb',
        sublayers:
          [
            { // background layer; all but selected polygon, for context
              sql: this.otherCatchmentsSQL,
              cartocss: "#" + app.db.polygons + app.geo.backgroundCSS,
            },
            { // selected boundary
              sql: this.catchmentsSQL,
              cartocss: "#" + app.db.polygons + app.geo.catchmentCSS,
            },
          ]
      }).addTo(map)
        .done(function (layer) {
          that.layer = layer;
          that.sublayers = {
            otherCatchments: layer.getSubLayer(0),
            selectedCatchment: layer.getSubLayer(1),
          };

          // Let a user shift-click the map to find school districts.
          map.on('click', function (e) {
            console.log(e.latlng);
            if (e.originalEvent.shiftKey) {
              app.lat = e.latlng.lat;
              app.lng = e.latlng.lng;

              // reverse geocode to grab the selected address, then get results.
              app.reverseGeocode(app.findByLocation);
            }
          });
        })
        .error(function (err) {
          //log the error
          console.error(err); // TODO: console.XYZ needs definition on some older browsers
        });

      this.addFilters();
    } else {
      map = this.map;
      that.sublayers.selectedCatchment.setSQL(this.catchmentsSQL);
    }

    this.addHomeMarker();


    if (app.level === 'primary') {
      $('body').addClass('level-primary');
      $('body').removeClass('level-secondary');
    }
    if (app.level === 'secondary') {
      $('body').addClass('level-secondary');
      $('body').removeClass('level-primary');
    }

    // add result set to map
    var markers = [];
    this.schools.schools.forEach(function (resultSchool) {
      var icon;
      if (resultSchool === school) { // a result that's also the currently selected school
        icon = app.geo.pickedIcons[school.type];
      } else {
        icon = app.geo.resultIcons[school.type];
      }
      var marker = L.marker([resultSchool.latitude, resultSchool.longitude], {icon: icon})
        // note we're using a bigger offset on the popup to reduce flickering;
        // since we hide the popup on mouseout, if the popup is too close to the marker,
        // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
        // moves near the edge between the marker and popup, making the popup flicker on and off.
        .bindPopup("<b>" + resultSchool.school_name + "</b>", {offset: [0, -28]})
        .on('click', that.clickResultSchool(resultSchool))
        .on('mouseover', MapView.onMouseOverOut, that)
        .on('mouseout', MapView.onMouseOverOut, that);

      if (resultSchool === school) {
        that.selectedMarker = marker;
        that.activeResultMarker = marker;
      }

      markers.push(marker);
    });

    if (this.resultMarkersGroup) {
      this.map.removeLayer(this.resultMarkersGroup);
    }
    this.resultMarkersGroup = new L.featureGroup(markers);
    this.map.addLayer(this.resultMarkersGroup);

    // pan + zoom to the selected results
    this.fitBounds();
    this.selectedMarker.openPopup(); // make the current result quite visible by showing it's popup
  };

}());