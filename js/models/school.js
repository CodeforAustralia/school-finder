app = app || {};

(function () {

  Handlebars.registerHelper('yesNo', function (field) {
    return field ? "Yes" : "No";
  });

  Handlebars.registerHelper('careOptions', function(before, after, vacation) {
	var ret = "";
    if (before == "true")
		ret = "Before school";
    if (after == "true"){
		if (ret != "")
			ret += ", ";
		ret += "After school";
	}
	
    if (vacation == "true"){
		if (ret != "")
			ret += ", ";
		ret += "Vacation care";
	}
	return ret;
  });
  
  /* create a new School. */
  app.School = function (fields) {
    _.extend(this, fields);
  };

  // output of SELECT distinct(type) FROM dec_schools WHERE preschool IN (true)
  var is_preschool_possible = function (type) {
    return type === 'primary' || type === 'infants' || type === 'other' || type === 'central';
  };

  // output of SELECT distinct(type) FROM dec_schools WHERE oshc IN (true)
  var is_opportunity_class_possible = function (type) {
    return type === 'primary' || type === 'central';
  };

  // SELECT distinct(type) FROM dec_schools WHERE selective_school IN ('Partially Selective', 'Fully Selective')
  var is_selective_possible = function (type) {
    return type === 'secondary' || type === 'central';
  };

  // SELECT distinct(type) FROM dec_schools WHERE school_specialty_type NOT IN ('Comprehensive')
  var is_specialty_possible = function (type) {
    return type === 'secondary' || type === 'central';
  };

  // SELECT distinct(type) FROM dec_schools  WHERE intensive_english_centre = true
  var is_intensive_english_possible = function (type) {
    return type === 'secondary';
  };


  // return approx distance (km rounded to nearest tenths) from this school to the user,
  // or nothing if user location is unset
  app.School.prototype.distanceToUser = function () {

    // We don't always have a user location
    // (e.g. if searching for a specific school)
    // That's OK, return nothing in that case.
    if (!app.lat || !app.lng) { return; }

    var userLatLng = new L.latLng(app.lat, app.lng);
    var schoolLatLng = new L.latLng(this.latitude, this.longitude);
    var meters = userLatLng.distanceTo(schoolLatLng);

    return app.util.roundToOne(meters / 1000);
  };

  // return the cached distance between this school's lat,lng
  // and the user's current location, or falsy if none cached.
  app.School.prototype._getCachedDistance = function () {
    if (app.haveUserLocation()) {
      var cachedDistance = false,
          key1 = '' + app.lat,
          key2 = '' + app.lng;
      if (this.distanceCache && this.distanceCache[key1]) {
        cachedDistance = this.distanceCache[key1][key2];
      }
      return cachedDistance;
    }
  };

  // cache the distance between this school's lat,lng
  // and the user's current location
  app.School.prototype._setCachedDistance = function (distance) {
    this.distanceCache = this.distanceCache || {};
    if (app.haveUserLocation()) { // otherwise, skip it
      var key1 = '' + app.lat,
          key2 = '' + app.lng;
      this.distanceCache[key1] = this.distanceCache[key1] || {};
      this.distanceCache[key1][key2] = distance;
    }
  };

  // lookup network distance and call either success or failure callback
  // we'll cache distance so we don't hit APIs again unless user location changes
  // (we assume school location is fixed but user may change their location)
  //
  // success: function (routeDistance), where routeDistance has properties 'kilomet'
  // failure: function (error)
  app.School.prototype.getRouteDistanceToUser = function (success, failure) {

    if (!app.haveUserLocation()) {
      failure(app.error.NO_USER_LOCATION);
    } else {

      var routeDistance = this._getCachedDistance();
      if (routeDistance) { // use cache when possible
        success(routeDistance);
        return;
      } else { // bummer, no cache. go to network.
        var schoolCoords = app.LatLng(this.latitude, this.longitude);
        var userCoords = app.LatLng(app.lat,app.lng);
        try {
          app.geo.getRouteDistance(schoolCoords, userCoords, function (routeDistance) {
            this._setCachedDistance(routeDistance);
            success(routeDistance);
          });
        } catch (error) {
          failure(error);
        }
      }

    }

  };

  app.School.prototype.toTemplateContext = function (i) {

    var context = _.extend(this,
      {
        resultNumber: i,
        website: this.website.replace("http://", ""),
        grades: this.school_subtype,
        established: function () {
          // try to return something human friendly if we can parse date.
          var d = new Date(this.date_1st_teacher);
          if (d) { return d.getFullYear(); }
          return this.date_1st_teacher;
        },
        homeAddress: app.address,
        homeLat: app.lat,
        homeLng: app.lng,
        distance: function () {
          return this.distanceToUser();
        },
        is_preschool_possible: is_preschool_possible(this.type),
        is_opportunity_class_possible: is_opportunity_class_possible(this.type),
        is_selective_possible: is_selective_possible(this.type),
        is_specialty_possible: is_specialty_possible(this.type),
        is_somewhat_selective: this.selective_school !== "Not Selective",
        is_intensive_english_possible: is_intensive_english_possible(this.type),
        support_offered: this.support_ids ? _.map(this.support_ids, function (id) {
          return app.supports[id];
        }) : false,

      });

    return context;
  };

}());
