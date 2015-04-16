var app, cartodb, Handlebars, L;
app = app || {};

(function () {

  var MapView = function () {
    this.$el = $('#map-container');
    this.template = Handlebars.compile($("#map-template").html());
  };

  app.MapView = MapView;

  MapView.prototype.update = function (schools) {
    this.schools = schools;
    this.render();
  };

  MapView.prototype.render = function () {

    if (!this.schools) { return; } /* must update() w/ school list before rendering */

    var context = {};
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);

    this.init();
  };


  MapView.onMouseOverOut = function (e) {
    var marker = e.target;
    if (e.type === 'mouseover') {
      marker.openPopup();
    } else if (e.type === 'mouseout') {
      marker.closePopup();
    }
  };

  // Let a user move the home marker to re-search at that location
  MapView.onMarkerDragEnd = function (event) {
    var marker = event.target;
    marker.closePopup();
    app.config.showHomeHelpPopup = false; // keep hidden from now on.
    var ll = marker.getLatLng();
    console.log(ll);
    app.lat = ll.lat;
    app.lng = ll.lng;
    // reverse geocode to grab the selected address, then get results.
    app.reverseGeocode(app.findByLocation);
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
    q.setSchoolType([app.level || school.type, 'ssp'])
      .where("s.school_code NOT IN (" +  _.pluck(this.schools.schools, 'school_code') + ")")
      .byBounds(bounds);
    q.run(function (data) {
      // add schools (except this one, already added) to map
      console.log(data);
      var markers = [];
      data.rows.forEach(function (row) {
        var marker = L.marker([row.latitude, row.longitude], {icon: app.geo.nearbyIcon})
          // note we're using a bigger offset on the popup to reduce flickering;
          // since we hide the popup on mouseout, if the popup is too close to the marker,
          // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
          // moves near the edge between the marker and popup, making the popup flicker on and off.
          .bindPopup("<b>" + row.school_name + "</b>", {offset: [0, -28]})
          .on('mouseover', MapView.onMouseOverOut)
          .on('mouseout', MapView.onMouseOverOut);
        markers.push(marker);
      });
      if (that.nearbyMarkersGroup) {
        that.map.removeLayer(that.nearbyMarkersGroup);
      }
      that.nearbyMarkersGroup = new L.featureGroup(markers);
      that.map.addLayer(that.nearbyMarkersGroup);

    });
  };

  MapView.prototype.init = function () {

    var school = this.schools.selected();

    // school level may be unspecified (if just searching by school name)
    // allow for that
    var levelFilter = '';
    if (app.level) {
      levelFilter = "school_type ~* '" + app.level + "' AND ";
    }

    var catchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + school.school_code + "'";

    this.catchmentsSQL = catchmentsSQL;

    // center on either user's location or selected school
    var center = null;
    if (app.lat && app.lng) {
      center = [app.lat, app.lng];
    } else if (school.latitude && school.longitude) {
      center = [school.latitude, school.longitude];
    }

    // initiate leaflet map
    var mapEl = this.$el.find(":first")[0];
    var map = new L.Map(mapEl, {
      center: center,
      zoom: 12,
      scrollWheelZoom: false,
    });
    this.map = map;
    var that = this;

    map.on('viewreset moveend', function () {
      that.loadNearby();
    });

    L.tileLayer(app.geo.tiles, { attribution: app.geo.attribution }).addTo(map);

    // add result set to map
    this.schools.schools.forEach(function (resultSchool) {
      var icon;
      if (resultSchool === school) { // a result that's also the currently selected school
        icon = app.geo.pickedIcon;
      } else {
        icon = app.geo.resultIcon;
      }
      L.marker([resultSchool.latitude, resultSchool.longitude], {icon: icon})
        .addTo(map)
        // note we're using a bigger offset on the popup to reduce flickering;
        // since we hide the popup on mouseout, if the popup is too close to the marker,
        // then the popup can actually sit on top of the marker and 'steals' the mouse as the cursor
        // moves near the edge between the marker and popup, making the popup flicker on and off.
        .bindPopup("<b>" + resultSchool.school_name + "</b>", {offset: [0, -28]})
        .on('mouseover', app.MapView.onMouseOverOut)
        .on('mouseout', app.MapView.onMouseOverOut);
    });



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
            sql: "SELECT * FROM " + app.db.polygons + " WHERE school_type ~* '" + app.level + "' AND school_code != '" + school.school_code + "'",
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
        that.layers = {};
        that.layers.catchment = layer.getSubLayer(1);

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

        // add a 'home' looking icon to represent the user's location
        if (app.lat && app.lng) {
          var marker = L.marker([app.lat, app.lng], {icon: app.geo.homeIcon, draggable: true})
                        .addTo(map)
                        .on('dragend', MapView.onMarkerDragEnd);
          if (app.config.showHomeHelpPopup) {
            marker.bindPopup("<b>Your location (draggable)</b>")
                  .openPopup();
          }
        }

        var hasCatchment = school.shape_area ? true : false;
        if (hasCatchment) {
          // zoom in to show the full catchment area
          app.sql.getBounds(that.catchmentsSQL).done(function (bounds) {
            that.map.fitBounds(bounds);
          });
        } else if (app.lat && app.lng) {
          // zoom to fit selected school + user location
          var southWest = L.latLng(school.latitude, school.longitude);
          var northEast = L.latLng(app.lat, app.lng);
          map.fitBounds(L.latLngBounds(southWest, northEast), {padding: [50, 50]});
        }
      })
      .error(function (err) {
        //log the error
        console.error(err); // TODO: console.XYZ needs definition on some older browsers
      });
  };





}());