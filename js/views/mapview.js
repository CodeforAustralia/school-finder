app = app || {};

(function () {

  M = app.M;

  var MapView = function () {
    this.$el = $('#map-container');
    this.template = Handlebars.compile($('#map-template').html());
  };

  app.MapView = MapView;

  MapView.prototype.update = function (schools) {
    this.schools = schools;
    this.render();
  };


  MapView.prototype.render = function () {

    // for now do this in render() - for testing we might
    // want to change geoProvider on the fly and re-render w/
    // a different map.
    M.init(app.config.geoProvider);

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


  var getOnMarkerMouseOver = function (marker) {
    return function onMarkerMouseOver () {
      marker.openPopup();
    };
  };

  var getOnMarkerMouseOut = function (marker, mapView) {
    return function onMarkerMouseOut () {
      if (!mapView.selectedMarker || marker !== mapView.selectedMarker) {
        // only auto close on mouse out if the marker hasn't been specifically selected (clicked)
        marker.closePopup();
      }
    };
  };


  var getOnMarkerDragEnd = function (marker) {
    return function onMarkerDragEnd () {
      marker.closePopup();
      var ll = marker.getLatLng();
      console.log(ll);
      app.lat = ll.lat();
      app.lng = ll.lng();
      // reverse geocode to grab the selected address, then get results.
      app.reverseGeocode(app.findByLocation);
      app.mapView.homeMarker = marker;
    };
  };


  MapView.prototype.clickSchool = function (row, marker) {
    var that = this;
    return function (e) {
      // open the school name popup [and closing any others, via our generic map implementation]
      marker.openPopup();

      if (e.originalEvent == 'KeyboardEvent') {
        // hack for accessibility - no good way to tell popup focus to shift - see
        // https://github.com/Leaflet/Leaflet/issues/2199
        var popupNode = e.target._popup._contentNode;
        // could be better -- update app.ui.setTabFocus to take an $el.
        // $(popupNode).find([tabindex="-1"]).focus();
        popupNode.querySelector('a').focus();
      }

      that.selectedMarker = marker;

      // tell the school view to show this particular school
      app.schoolView.update(new app.School(row));
    };
  };


  MapView.prototype.clickResultSchool = function (school, marker) {
    var that = this;
    return function () {

      // open the school name popup [and generic marker will close any existing popups]
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

      app.ui.viewSchool(school.school_code, '.cartodb-map');
    };
  };


  var getPopupForFilter = function (school, checkMatch) {
    var popup = '<a href="#school-info-container" class="popup-schoolname" title="Jump to school info"><span class="sr-only">Go to </span>' + school.school_name + '<span class="sr-only"> information</span></a>';

    if (school.type !== app.state.nearby.type) {
      var displayType = school.type;
      if (school.type === 'central') {
        displayType = 'Central/Community';
      } else if (school.type === 'ssp') {
        displayType = 'School for Specific Purposes';
      } else { // just capitalize type
        displayType = displayType.charAt(0).toUpperCase() + displayType.substring(1);
      }
      popup += '<div class="popup-meta popup-school-type">School type: ' + displayType + '</div>';
    }

    var filter = app.state.nearby.filterFeatureForType[app.state.nearby.type];

    if (filter && filter.name !== 'any') {
      var matchInfo = '';
      if (!checkMatch || filter.matchTest(school)) {
        if (filter.name === 'specialty') {
          matchInfo += 'Specialty offered: ' + school.school_specialty_type;
        } else {
          matchInfo += filter.matchLabel;
        }
      } else {
        matchInfo += filter.mismatchLabel;
      }
      if (matchInfo !== '') {
        popup += '<div class="popup-meta popup-match-info">' + matchInfo + '</div>';
      }
    }

    return '<div class="popup-schoolname-container" tabindex="-1">' + popup + '</div>';
  };


  var addMarkers = function (mapview, data) {
    var markers = [];
    data.rows.forEach(function (row) {
      var marker = M.marker(app.LatLng(row.latitude, row.longitude), {icon: app.geo.nearbyIcons[row.type]});
        // note we're using a bigger offset on the popup to reduce flickering;
        // since we hide the popup on mouseout, if the popup is too close to the marker,
        // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
        // moves near the edge between the marker and popup, making the popup flicker on and off.
      marker.bindPopup(getPopupForFilter(row, false), {offset: [0, -28]})
        .on('click', mapview.clickSchool(row, marker))
        .on('mouseover', getOnMarkerMouseOver(marker))
        .on('mouseout',  getOnMarkerMouseOut(marker, mapview));
      markers.push(marker);
    });

    if (mapview.nearbyMarkers) {
      mapview.mapX.removeMarkerSet(mapview.nearbyMarkers);
    }
    mapview.nearbyMarkers = M.markerSet(markers);
    mapview.mapX.addMarkerSet(mapview.nearbyMarkers);

    return markers;
  };

  // Fetch nearby schools and add them to the map for context
  MapView.prototype.loadNearby = function () {
    app.util.log("loadNearby()");
    if (!app.state.showNearby) {
      if (this.nearbyMarkers) {
        app.util.log('loadNearby(): removing nearby markers');
        this.mapX.removeMarkerSet(this.nearbyMarkers);
      }
      app.util.log('loadNearby(): state.showNearby is false and no markers shown; nothing to do.');
      return;
    }
    var that = this;
    var school = this.schools.selected();

    // get current view's bounding box
    var bounds = this.mapX.getBounds();

    // query for nearby schools
    // http://postgis.refractions.net/docs/ST_MakeEnvelope.html ST_MakeEnvelope(left, bottom, right, top, [srid]) SRID defaults to 4326

    var q = new app.Query();
    // If app.level is unspecified (when someone just first searched for a school by name),
    // then just show schools of that type (instead of all schools).
    // But the nearby school selector widget can override this (via app.state.nearby.type)
    var type = app.state.nearby.type || app.level || school.type;

    var otherTypes = app.state.nearby.othersForType[app.state.nearby.type];
    if (otherTypes) {
      type = [type].concat(otherTypes);
    }

    q.setSchoolType(type, true).setSupport(app.support_needed)
      .where('s.school_code NOT IN (' +  _.pluck(this.schools.schools, 'school_code') + ')')
      .byBounds(bounds);
    if (app.state.nearby.filterFeatureForType[app.state.nearby.type] && app.state.nearby.filterFeatureForType[app.state.nearby.type].sql) { // add custom filter if it has been set
      q.where(app.state.nearby.filterFeatureForType[app.state.nearby.type].sql);
    }
    q.run(function (data) {
      // add schools (except this one, already added) to map
      console.log(data);
      if (data.rows.length < 1) {

        app.util.log('No results visible; re-doing search and zooming...');
        var q2 = new app.Query();

        // If user hasn't provided their location yet, center our search
        // on the school they must have searched for.
        var lat = app.lat || app.schoolView.school.latitude;
        var lng = app.lng || app.schoolView.school.longitude;
        if (!lat || !lng) { console.log('yikes, we have no lat/lng to search around!'); }

        q2.setSchoolType(type, true).setSupport(app.support_needed)
          .where('s.school_code NOT IN (' +  _.pluck(that.schools.schools, 'school_code') + ')')
          .setLimit(1)
          .byClosest(lat, lng);
        if (app.state.nearby.filterFeatureForType[app.state.nearby.type] && app.state.nearby.filterFeatureForType[app.state.nearby.type].sql) { // add custom filter if it has been set
          q2.where(app.state.nearby.filterFeatureForType[app.state.nearby.type].sql);
        }

        q2.run(function (data) {
          // the code above should result in sql like this:
          // SELECT s.*, b.shape_area,
          //  ST_DISTANCE(s.the_geom::geography, ST_SetSRID(ST_Point(151.18939,-33.892638),4326)::geography) AS dist
          //  FROM dec_schools AS s LEFT OUTER JOIN catchments AS b ON s.school_code = b.school_code
          //  WHERE ((s.type = 'secondary' OR s.type = 'central') AND s.school_code NOT IN (1735) AND s.gender = 'boys')
          //  ORDER BY dist LIMIT 1

          var markers = addMarkers(that, data);

          // fit view of map to user location + results
          var homeMarker = M.marker(app.LatLng(lat, lng), {icon: app.geo.homeIcon});

          // Note that loadNearby is just loading nearby markers and
          // setting the map view based mainly on those.
          // If we know the user's location, we want the map
          // to be zoomed out enough to show how far the schools are
          // from the user's location.
          // ...
          // So! In short, we use the home marker for a calculation here
          // but we aren't trying to actually add it to the map.
          markers.push(homeMarker);

          var bounds = M.getBounds(markers);
          // app.util.log('map fitbounds() w/ bounds:');
          // app.util.log(bounds);
          that.map.fitBounds(bounds);
        });
		
      } else {
        addMarkers(that, data);
      }
    });
  };


  MapView.prototype.addHomeMarker = function () {
    if (!this.map) { return; } // can't add marker if map doesn't yet exist.

    var markerLatLng;
    if (app.lat && app.lng) {
      markerLatLng = app.LatLng(app.lat, app.lng);
    }

    if (this.homeMarker) {
      // it's already on the map, just make sure it's in the right spot.
      if (markerLatLng) {
        this.homeMarker.setLatLng(markerLatLng);
      }
      app.util.log('addHomeMarker(): home marker existed, updating location and finishing');
      return;
    }

    var mapview = this;
    // add a 'home' looking icon to represent the user's location
    if (markerLatLng) {
      this.homeMarker = M.marker(markerLatLng, {icon: app.geo.homeIcon, draggable: true});
      this.homeMarker.on('dragend', getOnMarkerDragEnd(this.homeMarker))
                     .on('mouseover', getOnMarkerMouseOver(this.homeMarker)) // new from google version...
                     .on('mouseout', getOnMarkerMouseOut(this.homeMarker, mapview)) // ... always popup on mouse over/out
                      // .on('dragend', MapView.onMarkerDragEnd)
                     .bindPopup('<b>Your location (draggable)</b>')
                     .addTo(this.map);
    }
  };


  // positions map based on user location, school location, and school catchment if any
  // Calls optional callback after we think we're done with pan/zoom.
  MapView.prototype.fitBounds = function (callback) {
    if (!this.map) { return; } // can't zoom on a map doesn't yet exist.
    var that = this;

    var school = this.schools.selected();
    var hasCatchment = school.shape_area ? true : false;
    if (hasCatchment) {
      // zoom in to show the full catchment area
      app.sql.getBounds(this.catchmentsSQL).done(function (bounds) {


        // sql.getBounds supposedly returns bounds
        // as [ [sw_lat, sw_lon], [ne_lat, ne_lon ] ]
        // for the geometry resulting of specified query.

        // but we don't trust it. rectifyBounds fixes case where we might
        // have any two points (like a NW & SE corner instead of SW & NE)

        var corner1 = bounds[0];
        var corner2 = bounds[1];

        var llBounds1 = M.rectifyBounds(
          corner1[0], corner2[0], // latitudes
          corner1[1], corner2[1]  // longitudes
        );

        app.util.log('MapView.fitbounds() with bounds:');
        app.util.log(llBounds1.toString());
        that.map.fitBounds(llBounds1);

        if (callback) callback();
        return;
      });

      var llSchool = app.LatLng(school.latitude, school.longitude);
      this.map.panTo(llSchool);

    } else if (app.lat && app.lng) {
      // zoom to fit selected school + user location

      var llBounds2 = M.rectifyBounds(+school.latitude, app.lat, +school.longitude, app.lng);

      this.mapX.fitBounds(llBounds2, {padding: [50, 50]});

      // TODO replace w/ adjusting bounds based on padding in mapX.fitBounds
      // nasty padding hack:
      // this.map.setZoom(this.map.getZoom() - 1);

      if (callback) callback();
      return;
    } else {
      // no school catchment & no user location, so just zoom to the school's location
      this.map.panTo(app.LatLng(school.latitude, school.longitude));
      if (callback) callback();
      return;
    }
  };


  MapView.prototype.updateResultsPopups = function () {
    M.iterateMarkerSet(this.resultMarkers, function (marker) {
      marker.setPopupContent(getPopupForFilter(marker.options.school, true));
    });
  };


  // sets catchments related SQL on the MapView object.
  MapView.prototype._initCatchmentsSQL = function (schoolCode, appLevel) {
    // get WHERE condition for SQL query to filter by catchment level.
    // level is one of the main types: primary or secondary.
    // If no level specified, empty string returned will have no affect on query
    var catchmentLevelCondition = function catchmentLevelCondition(level) {
      var sql = {
        "primary": "('primary','infants')",
        "secondary": "('secondary')",
      };
      return level ? " (catchment_level IN " + sql[level] + ") AND " : "";
    };

    var selectWhere = "SELECT * FROM " + app.db.polygons + " WHERE ";
    var schoolMatchCondition = " school_code = '" + schoolCode + "' ";
    var invertSchoolMatchCondition = " school_code != '" + schoolCode + "' ";

    // catchmentsSQL: used for getting bounds.
    // If school is community school, two (primary/secondary) catchments may be returned
    // but if they're searching for a specific school level we'll limit result to that.
    this.catchmentsSQL = selectWhere + catchmentLevelCondition(appLevel) + schoolMatchCondition;

    // these catchment queries give us polygons to overlay on map
    this.catchmentsSQL1ary = selectWhere + catchmentLevelCondition('primary')   + schoolMatchCondition;
    this.catchmentsSQL2ary = selectWhere + catchmentLevelCondition('secondary') + schoolMatchCondition;

    // all other catchments. If user is searching for a type (they clicked primary or
    // secondary school button), levelFilter will ensure the surrounding catchments match that type.
    this.otherCatchmentsSQL = selectWhere + catchmentLevelCondition(appLevel) + invertSchoolMatchCondition;
  };


  MapView.prototype.init = function () {
    var that = this;

    // TODO: don't re-render if we click the already-selected school

    var school = this.schools.selected();

    this._initCatchmentsSQL(school.school_code, app.level);

    app.state.nearby.type = app.level || school.type;

    // initiate leaflet map
    var map;
    if (!this.map) { // create map for first time

      // center on either user's location or selected school
      var center = null;
      if (app.lat && app.lng) {
        center = new app.LatLng(app.lat, app.lng);
        // center = [app.lat, app.lng];
      } else if (school.latitude && school.longitude) {
        center = new app.LatLng(school.latitude, school.longitude);
        // center = [school.latitude, school.longitude];
      }

      var mapEl = this.$el.find('#cartodb-map')[0];

      var mapOptions = {
        // general settings
        center: center,
        zoom: app.config.defaultZoom,

        // Leaflet:

        scrollWheelZoom: false, // false to prevent user's page scrolling from affecting zoom

        // Google:

        scrollwheel: false, // same as Leaflet's scrollWheelZoom above but for Google Maps

        mapTypeControl: false, // google: [Map|Satellite] :iphone not wide enough for both this + [Nearby schools]

        scaleControl: true,
        streetViewControl: true,
        streetViewControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT
        }

      };



      var mapX = M.map(mapEl, mapOptions); // mapX: X for any / generic map object
      this.mapX = mapX;
      map = mapX.getActualMap(); // map is actual map (specifically, Leaflet or Google map)
      this.map = map;

      var newBoundsRequery = function newBoundsRequery () {
        that.loadNearby();
        that.mapX.updateForAccessibility(); // accessbility fix needed any time map updates
        that.$el.find('.cartodb-logo a, .leaflet-control-attribution a').attr('tabindex', '-2');
      };
      mapX.onViewChange(newBoundsRequery);

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
            sql: this.catchmentsSQL1ary,
            cartocss: "#" + app.db.polygons + app.geo.catchmentCSS1ary,
          },
          { // selected boundary
            sql: this.catchmentsSQL2ary,
            cartocss: "#" + app.db.polygons + app.geo.catchmentCSS,
          },
        ]
      }).addTo(map)
        .done(function (layer) {
          that.layer = layer;
          that.sublayers = {
            otherCatchments: layer.getSubLayer(0),
            selectedCatchment1: layer.getSubLayer(1),
            selectedCatchment2: layer.getSubLayer(2),			
          };

          // Let a user shift-click the map to find school districts.
          if (app.config.geoProvider === 'mapbox') {
            // only works on Leaflet since Google maps doesn't give us
            // access to both DOM event info and lat/lng of click at same time.
            mapX.on('click', function (e) {
              if (e.originalEvent.shiftKey) {
                app.lat = e.latlng.lat;
                app.lng = e.latlng.lng;

                // reverse geocode to grab the selected address, then get results.
                app.reverseGeocode(app.findByLocation);
              }
            });
          }

          that.mapX.updateForAccessibility(); // accessibility fix for carto layer tiles too
          // fix so keyboard users aren't constantly running into attribution links
          // but then... those users actually can't access these links. Hmm.
          that.$el.find('.cartodb-logo a, .leaflet-control-attribution a').attr('tabindex', '-2');
        })
        .error(function (err) {
          //log the error
          console.error(err); // TODO: console.XYZ needs definition on some older browsers
        });


      this.mapX.addMapControls();

    } else { // update the existing map
      map = this.map;
      that.sublayers.selectedCatchment1.setSQL(this.catchmentsSQL1ary);
      that.sublayers.selectedCatchment2.setSQL(this.catchmentsSQL2ary);
      // this.schoolsNearby.update();
      //gg this.schoolsNearby.update(); - why disable schools-nearby map control update in google version?
      this.mapX.updateMapControls();
    }

    this.addHomeMarker();

    // add result set to map
    var markers = [];
    this.schools.schools.forEach(function (resultSchool) {
      var icon;
      if (resultSchool === school) { // a result that's also the currently selected school
        icon = app.geo.pickedIcons[resultSchool.type];
      } else {
        icon = app.geo.resultIcons[resultSchool.type];
      }
      var marker = M.marker(app.LatLng(resultSchool.latitude, resultSchool.longitude), {icon: icon, school: resultSchool});
        // note we're using a bigger offset on the popup to reduce flickering;
        // since we hide the popup on mouseout, if the popup is too close to the marker,
        // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
        // moves near the edge between the marker and popup, making the popup flicker on and off.
      marker.bindPopup(getPopupForFilter(resultSchool, true), {offset: [0, -28]})
        .on('click', that.clickResultSchool(resultSchool, marker))
        .on('mouseover', getOnMarkerMouseOver(marker))
        .on('mouseout', getOnMarkerMouseOut(marker, that));

      if (resultSchool === school) {
        that.selectedMarker = marker;
        that.activeResultMarker = marker;
      }

      markers.push(marker);

    });

    if (this.resultMarkers) {
      this.mapX.removeMarkerSet(this.resultMarkers);
    }
    this.resultMarkers = M.markerSet(markers);
    this.mapX.addMarkerSet(this.resultMarkers);

    // pan + zoom to the selected results, then open marker popup
    // note! important to not try opening the marker popup while zooming/panning via fitBounds,
    // as that can result in just seeing all black tiles.
    // the behavior was observed while following the procedure to reproduce issue #254 and
    // seems to also cause the misplaced controls from #253.
    // To solve that, we ask fitBounds to open the popup later via a callback.

    app.util.log('MapView.init() calling MapView.fitBounds() on home marker + any result schools.');
    this.fitBounds(function () {
      that.selectedMarker.openPopup(); // make the current result quite visible by showing it's popup
    });
  };

}());