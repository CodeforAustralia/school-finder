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

    if (!this.schools || this.schools.schools.length < 1) { return; } /* must update() w/ school list before rendering */

    if (!this.rendered) {

    		var context = {};
      		var html = this.template(context);

      		// clean up any previous result & re-add
      		this.$el.empty();
      		this.$el.append(html);
    	}

    	this.init();

    	this.rendered = true;
  	};

	addMarkerMouseOver = function(marker){
		marker.addListener('mouseover', function() {
	        marker.openPopup();
		});
	}
	
	addMarkerMouseOut = function(marker){
		marker.addListener('mouseout', function() {
	        if (!app.mapView.selectedMarker || marker !== app.mapView.selectedMarker) {
	          // only auto close on mouse out if the marker hasn't been specifically selected (clicked)
	          marker.closePopup();
	        }
		});
	}

	addMarkerDragEnd = function(marker){
		marker.addListener('dragend', function(){
			
			marker.closePopup();
			var ll = marker.getPosition();
			console.log(ll);
			app.lat = ll.lat();
			app.lng = ll.lng();
			// reverse geocode to grab the selected address, then get results.
			app.reverseGeocode(app.findByLocation);    	  
			app.mapView.homeMarker = marker;
		});
	}

	MapView.prototype.clickSchool = function (row, marker) {
		var that = this;
		return function (e) {
			// open the school name popup
			marker.openPopup();

			if (e.originalEvent == "KeyboardEvent") {
				// hack for accessibility - no good way to tell popup focus to shift - see
				// https://github.com/Leaflet/Leaflet/issues/2199
				var popupNode = e.target._popup._contentNode;
				// could be better -- update app.ui.setTabFocus to take an $el.
				// $(popupNode).find([tabindex="-1"]).focus();
				popupNode.querySelector('a').focus();
			}

			that.selectedMarker.closePopup();
			that.selectedMarker = marker;

			// tell the school view to show this particular school
			app.schoolView.update(new app.School(row));
		};
	};


	MapView.prototype.clickResultSchool = function (school, marker) {
		var that = this;
		return function (e) {

			// open the school name popup
			marker.openPopup();
			if (that.selectedMarker === marker) {
				return; // nothing to do
			}

			that.selectedMarker.closePopup();
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
			if (school.type === "central") {
				displayType = "Central/Community";
			} 
			else if (school.type === "ssp") {
				displayType = "School for Specific Purposes";
			} 
			else { // just capitalize type
				displayType = displayType.charAt(0).toUpperCase() + displayType.substring(1);
			}
			popup += '<div class="popup-meta popup-school-type">School type: ' + displayType + '</div>';
		}

		var filter = app.state.nearby.filterFeatureForType[app.state.nearby.type];
    
		if (filter && filter.name !== "any") {
			var matchInfo = '';
			if (!checkMatch || filter.matchTest(school)) {
				if (filter.name === 'specialty') {
					matchInfo += "Specialty offered: " + school.school_specialty_type;
				} 
				else {
					matchInfo += filter.matchLabel;
				}
			} 
			else {
				matchInfo += filter.mismatchLabel;
			}
			if (matchInfo !== '') {
				popup += '<div class="popup-meta popup-match-info">' + matchInfo + '</div>';
			}
		}

		return '<div class="popup-schoolname-container" tabindex="-1">' + popup + '</div>';
	};

  SFMarker = function(latlng, iconObj, popup, school, draggable){
	  var that = new google.maps.Marker({draggable: draggable});
	  that.infoWindow = null;
	  that.setPosition(latlng);
	  that.setTitle(null); 
	  that.setIcon(iconObj);
	  that.popup = popup;
	  that.school = school;
	  
	  that.openPopup = function(){	  
		  if (!that.infoWindow)
			  that.infoWindow = new google.maps.InfoWindow({
			        content: that.popup
			  });
		  
		  that.infoWindow.open(this.map, that);		 
	  }
	  
	  that.closePopup = function(){
		  if (that.infoWindow){
			  that.infoWindow.close();
			  that.infoWindow = null;
		  }
	  }
	  
	  that.setPopupContent = function(content){
		  that.popup = content;
	  }
	  
	  return that;
  }

  SFIcon = function(options){
  	return {
        url: options.iconUrl,
        // This marker is 20 pixels wide by 32 pixels high.
        size: new google.maps.Size(options.iconSize[0], options.iconSize[1]),
        // The origin for this image is (0, 0).
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the flagpole at (0, 32).
        anchor: new google.maps.Point(options.popupAnchorGoogle[0], options.popupAnchorGoogle[1])
//        anchor: new google.maps.Point(18, 45)
      };
  }
  
  var addMarkers = function (mapview, data) {
    var that = mapview;
    var markers = [];
    data.rows.forEach(function (row) {
    	var iconObj = new SFIcon(app.geo.nearbyIcons[row.type].options);
    	var marker = new SFMarker(new google.maps.LatLng(row.latitude, row.longitude), iconObj, getPopupForFilter(row, false), row, false);
    	marker.addListener('click', that.clickSchool(row, marker));    	
    	addMarkerMouseOver(marker);
    	addMarkerMouseOut(marker);
    	markers.push(marker);
    	marker.setMap(that.map);
    });

    if (that.nearbyMarkersGroup) {
    	removeResultsPopups(that.nearbyMarkersGroup);
    }

    that.nearbyMarkersGroup = markers;
    addResultsPopups(that.nearbyMarkersGroup);
    return markers;
  };

  // Fetch nearby schools and add them to the map for context
  MapView.prototype.loadNearby = function () {
    if (!app.state.showNearby) {
      if (this.nearbyMarkersGroup) {
        removeResultsPopups(this.nearbyMarkersGroup);
      }
      return;
    }
    var that = this;
    var school = this.schools.selected();

    // get current view's bounding box
    var mapBounds = this.map.getBounds();

    // query for nearby schools
    // http://postgis.refractions.net/docs/ST_MakeEnvelope.html ST_MakeEnvelope(left, bottom, right, top, [srid]) SRID defaults to 4326
    var bounds = {
      left: mapBounds.getSouthWest().lng(),
      bottom: mapBounds.getSouthWest().lat(),
      right: mapBounds.getNorthEast().lng(),
      top: mapBounds.getNorthEast().lat()
    };

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
      .where("s.school_code NOT IN (" +  _.pluck(this.schools.schools, 'school_code') + ")")
      .byBounds(bounds);
    if (app.state.nearby.filterFeatureForType[app.state.nearby.type] && app.state.nearby.filterFeatureForType[app.state.nearby.type].sql) { // add custom filter if it has been set
      q.where(app.state.nearby.filterFeatureForType[app.state.nearby.type].sql);
    }
    q.run(function (data) {
      // add schools (except this one, already added) to map
      console.log(data);
      if (data.rows.length < 1) {
		  
        console.log("No results visible; re-doing search and zooming...");
        var q2 = new app.Query();

        // If user hasn't provided their location yet, center our search
        // on the school they must have searched for.
        var lat = app.lat || app.schoolView.school.latitude;
        var lng = app.lng || app.schoolView.school.longitude;
        if (!lat || !lng) { console.log("yikes, we've got no lat/lng to search around!") }

        q2.setSchoolType(type, true).setSupport(app.support_needed)
          .where("s.school_code NOT IN (" +  _.pluck(that.schools.schools, 'school_code') + ")")
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

          var iconObj = new SFIcon(app.geo.homeIcon.options);
          this.homeMarker = new SFMarker(new google.maps.LatLng(lat, lng), iconObj, null, null, false);
//          this.homeMarker.addListener('mouseover', MapView.onMouseOverOut);
      	  addMarkerMouseOver(this.homeMarker);
          markers.push(this.homeMarker);
          this.homeMarker.setMap(that.map);

          var bounds = new Bounds(markers);
          that.map.fitBounds(bounds.getLatLngBounds());
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
      markerLatLng = new google.maps.LatLng(app.lat, app.lng);
    }

    if (this.homeMarker) {
      // it's already on the map, just make sure it's in the right spot.
      if (markerLatLng) {
        this.homeMarker.setPosition(markerLatLng);
      }
      return;
    }

    // add a 'home' looking icon to represent the user's location
    if (markerLatLng) {
        var iconObj = new SFIcon(app.geo.homeIcon.options);
        this.homeMarker = new SFMarker(markerLatLng, iconObj, "<b>Your location (draggable)</b>", null, true);
        this.homeMarker.setMap(this.map);
        addMarkerDragEnd(this.homeMarker);
    	addMarkerMouseOver(this.homeMarker);
    	addMarkerMouseOut(this.homeMarker);
    }
  };

  
  	MapView.prototype.fitBounds = function () {
  
  		if (!this.map) { return; } // can't zoom on a map doesn't yet exist.
  		var that = this;
    
  		var llBounds, sw, ne;
    
  		var school = this.schools.selected();
  		var hasCatchment = school.shape_area ? true : false;
  		if (hasCatchment) {
  			// zoom in to show the full catchment area
  			app.sql.getBounds(this.catchmentsSQL).done(function (bounds) {
	    	  
  				sw = new google.maps.LatLng(bounds[1][0], bounds[1][1]);
  				ne = new google.maps.LatLng(bounds[0][0], bounds[0][1]);    	
  				llBounds = new google.maps.LatLngBounds(sw, ne);
  				that.map.fitBounds(llBounds);
	    	
  			});
  			// Set to guess in case the query above doesn't return
			this.map.panTo(new google.maps.LatLng(school.latitude, school.longitude));
			zoom = this.map.getZoom();
			if (zoom > app.config.zoomGuess){
				this.map.setZoom(app.config.zoomGuess);
			}
  		} 
  		else if (app.lat && app.lng) {
    	
  			llBounds = rectifyBounds(Number(school.latitude), app.lat, Number(school.longitude), app.lng)
    	
  			this.map.fitBounds(llBounds);
  			// nasty padding hack
  			this.map.setZoom(this.map.getZoom() - 1);
  		}
  		else {
  			// no school catchment & no user location, so just zoom to the school's location
  			this.map.panTo(new google.maps.LatLng(school.latitude, school.longitude));
  		}
  	};


  MapView.prototype.updateResultsPopups = function () {
	  var markers = this.resultMarkersGroup;
	  for (var i = 0; i < markers.length; i++){
		  markers[i].setPopupContent(getPopupForFilter(markers[i].school, true));
	  };
  };

  removeResultsPopups = function (markers) {
	  for (var i = 0; i < markers.length; i++){
		  markers[i].setMap(null);
	  };
  };

  addResultsPopups = function (markers) {
	  for (var i = 0; i < markers.length; i++){
	      markers[i].setMap(this.map);
	  };
  };
  
  MapView.prototype.init = function () {
    var that = this;

    // TODO: don't re-render if we click the already-selected school

    var school = this.schools.selected();

    // school level may be unspecified (if just searching by school name)
    // allow for that
    var levelFilter = '';
    if (app.level) {
      var alsoInfantsIfPrimary = '';
      if (app.level === "primary") {
        alsoInfantsIfPrimary = " OR school_type ~* 'infants'";
      }
      levelFilter = "(school_type ~* '" + app.level + "'" + alsoInfantsIfPrimary + ") AND ";
    }

    this.catchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + school.school_code + "'";  // still useful for getting bounds 
    this.catchmentsSQL1ary = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + school.school_code + "' AND (catchment_level IN ('primary','infants'))";
    this.catchmentsSQL2ary = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code = '" + school.school_code + "' AND catchment_level = 'secondary'";
    this.otherCatchmentsSQL = "SELECT * FROM " + app.db.polygons + " " +
                 "WHERE " + levelFilter + "school_code != '" + school.school_code + "'";

    app.state.nearby.type = app.level || school.type;

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

      var mapEl = this.$el.find("#cartodb-map")[0];
      var sydney = new google.maps.LatLng(-33.848217, 150.931963);
      map = new google.maps.Map(this.$el.find("#cartodb-map")[0], {
          scrollwheel: false,
          center: sydney
        });
      map.setZoom(app.config.zoomGuess); //magic number to deal with pathological cases that (I think) involve multiple possible schools where some do and some don't have catchments and the non-catchment school is selected 

      this.map = map;
/*gg
 * qqq
      this.schoolsNearby = L.schoolsNearby(map); // add nearby schools control
      this.legend = L.legend(map); // add nearby schools control


*/
      google.maps.event.addListener(map, "dragend", newBoundsRequery);
      google.maps.event.addListener(map, "zoom_changed", newBoundsRequery);

      function newBoundsRequery(){
          that.loadNearby();
          that.addEmptyAlts(); // accessbility fix needed any time map updates
          that.$el.find('.cartodb-logo a, .leaflet-control-attribution a').attr('tabindex', '-2');
      }
      /*gg
      L.tileLayer(app.geo.tiles, { attribution: app.geo.attribution }).addTo(map);
*/
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
            },          ]
      }).addTo(map)
        .done(function (layer) {
          that.layer = layer;
          that.sublayers = {
            otherCatchments: layer.getSubLayer(0),
            selectedCatchment1: layer.getSubLayer(1),
            selectedCatchment2: layer.getSubLayer(2),			
          };

          // Let a user shift-click the map to find school districts.
          map.addListener('click', function (e) {
            console.log(e.latlng);
            if (e.originalEvent.shiftKey) {
              app.lat = e.latlng.lat;
              app.lng = e.latlng.lng;

              // reverse geocode to grab the selected address, then get results.
              app.reverseGeocode(app.findByLocation);
            }
          });

          that.addEmptyAlts(); // accessibility fix for carto layer tiles too
          // fix so keyboard users aren't constantly running into attribution links
          // but then... those users actually can't access these links. Hmm.
          that.$el.find('.cartodb-logo a, .leaflet-control-attribution a').attr('tabindex', '-2');
        })
        .error(function (err) {
          //log the error
          console.error(err); // TODO: console.XYZ needs definition on some older browsers
        });

    } else {
      map = this.map;
      that.sublayers.selectedCatchment1.setSQL(this.catchmentsSQL1ary);
      that.sublayers.selectedCatchment2.setSQL(this.catchmentsSQL2ary);
//gg      this.schoolsNearby.update();
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
    	var iconObj = new SFIcon(icon.options);
	    var marker = new SFMarker(new google.maps.LatLng(resultSchool.latitude, resultSchool.longitude), iconObj, getPopupForFilter(resultSchool, true), resultSchool, false);
	  	marker.addListener('click', that.clickResultSchool(resultSchool, marker));
    	addMarkerMouseOver(marker);

    	if (resultSchool === school) {
    		that.selectedMarker = marker;
    		that.activeResultMarker = marker;
    	}

    	markers.push(marker);
    });
    schoolFilter(that.map);

    if (this.resultMarkersGroup) {
    	removeResultsPopups(this.resultMarkersGroup);
    }
    this.resultMarkersGroup = markers;

    if (this.resultMarkersGroup) {
    	addResultsPopups(this.resultMarkersGroup);
    }

    // pan + zoom to the selected results
    this.fitBounds();
    this.selectedMarker.openPopup(); // make the current result quite visible by showing it's popup
  };


  // Accessibility fix: add empty alt="" tags to map tiles
  MapView.prototype.addEmptyAlts = function () {
    // map tiles are meaningless to screen readers, so set alt to ""
    // otherwise, the screen reader might read just the image file's name
    // https://github.com/Leaflet/Leaflet/issues/3210#issue-56830926 says:
    // "VO spoke the filename of the images in the map's base layer,
    // speaking, "6078 dot p n g, link", "6079 dot p n g, link", and so forth."

    // https://github.com/GoogleChrome/accessibility-developer-tools/wiki/Audit-Rules#ax_text_02 says:
    // <!-- Good: image used for presentation has an empty alt value -->
    // <img src="line.png" alt="">

    this.$el.find(".leaflet-tile-pane img").attr("alt", "");
    this.$el.find(".leaflet-tile-pane img").attr("alt", "");

  	}
  
  	Bounds = function(markers){
        var sydney = {lat: -33.848217, lng: 150.931963};
  		var left = 200;
  		var bottom = 0;
  		var right = 0;
  		var top = -100;
	  
  		for (var i = 0; i < markers.length; i++){
  			var latLng = markers[i].getPosition();
  			if (latLng.lat() > top)
  				top = latLng.lat();
  			if (latLng.lat() < bottom)
  				bottom = latLng.lat();
  			if (latLng.lng() < left)
  				left = latLng.lng();
  			if (latLng.lng() > right)
  				right = latLng.lng();  			
  		}
  		
  		this.getLatLngBounds = function(){
  			return new google.maps.LatLngBounds(new google.maps.LatLng(bottom, left), new google.maps.LatLng(top, right));
  		}
  	}

  	rectifyBounds = function(lat1, lat2, lng1, lng2){
  		
  		var swlat, swlng, nelat, nelng;
  		
  		if (lat1 > lat2){
  			swlat = lat2;
  			nelat = lat1;
  		}
		else{
  			swlat = lat1;
  			nelat = lat2;
  		}
  				
  		if (lng1 > lng2){
  			swlng = lng2;
  			nelng = lng1;
  		}
		else{
  			swlng = lng1;
  			nelng = lng2;
  		}
  		
  		var sw = new google.maps.LatLng(swlat, swlng);
  		var ne = new google.maps.LatLng(nelat, nelng);
		return new google.maps.LatLngBounds(sw, ne);
  	}
  	
}());