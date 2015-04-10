var app, L, cartodb;
app = app || {};

(function () {

  var Map = function (mapID, schoolsSQL, catchmentsSQL, school) {
    this.mapID = mapID;
    this.schoolsSQL = schoolsSQL;
    this.catchmentsSQL = catchmentsSQL;
    this.school = school;
    this.init();
  };
  app.Map = Map;


  Map.onMouseOverOut = function (e) {
    var marker = e.target;
    if (e.type === 'mouseover') {
      marker.openPopup();
    } else if (e.type === 'mouseout') {
      marker.closePopup();
    }
  };

  // Fetch nearby schools and add them to the map for context
  Map.prototype.loadNearby = function () {
    var that = this;

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
    q.setSchoolType(app.level || this.school.type)
      .where("s.school_code != " + this.school.school_code)
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
          .on('mouseover', Map.onMouseOverOut)
          .on('mouseout', Map.onMouseOverOut);
        markers.push(marker);
      });
      if (that.nearbyMarkersGroup) {
        that.map.removeLayer(that.nearbyMarkersGroup);
      }
      that.nearbyMarkersGroup = new L.featureGroup(markers);
      that.map.addLayer(that.nearbyMarkersGroup);

    });
  };

  Map.prototype.init = function () {

    // center on either user's location or selected school
    var center = null;
    if (app.lat && app.lng) {
      center = [app.lat, app.lng];
    } else if (this.school.latitude && this.school.longitude) {
      center = [this.school.latitude, this.school.longitude];
    }

    // initiate leaflet map
    var map = new L.Map(this.mapID, {
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
            sql: "SELECT * FROM " + app.db.polygons + " WHERE school_type ~* '" + app.level + "' AND school_code != '" + this.school.school_code + "'",
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

        // Let a user move the home marker to re-search at that location
        var onMarkerDragEnd = function (event) {
          var marker = event.target;
          marker.closePopup();
          app.showHomeHelpPopup = false; // keep hidden from now on.
          var ll = marker.getLatLng();
          console.log(ll);
          app.lat = ll.lat;
          app.lng = ll.lng;
          // reverse geocode to grab the selected address, then get results.
          app.reverseGeocode(app.findByLocation);
        };

        // add a 'home' looking icon to represent the user's location
        if (app.lat && app.lng) {
          var marker = L.marker([app.lat, app.lng], {icon: app.geo.homeIcon, draggable: true})
                        .addTo(map)
                        .on('dragend', onMarkerDragEnd);
          if (app.showHomeHelpPopup) {
            marker.bindPopup("<b>Your location (draggable)</b>")
                  .openPopup();
          }
        }
        // that.marker = marker;

        var hasCatchment = that.school.shape_area ? true : false;
        if (hasCatchment) {
          // zoom in to show the full catchment area
          app.sql.getBounds(that.catchmentsSQL).done(function (bounds) {
            that.map.fitBounds(bounds);
          });
        } else if (app.lat && app.lng) {
          // zoom to fit selected school + user location
          var southWest = L.latLng(that.school.latitude, that.school.longitude);
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