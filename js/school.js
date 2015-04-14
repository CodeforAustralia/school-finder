var app, L;
app = app || {};

(function () {

  var yesNo = function (field) {
    return field ? "Yes" : "No";
  };

  Handlebars.registerHelper('yesNo', function(field) {
  return field ? "Yes" : "No";
});

  /* create a new School. */
  app.School = function () {
  };

  app.School.toTemplateContext = function (fields, i) {
    return {
      resultNumber: i,
      description: fields.description,
      school_name: fields.school_name,
      street: fields.street,
      town_suburb: fields.town_suburb,
      postcode: fields.postcode,
      school_code: fields.school_code,
      phone: fields.phone,
      website: fields.website.replace("http://",""),
      level: function () {
        return app.level ? app.level.capitalize() : 'School';
      },
      grades: fields.subtype,
      selective_school: fields.selective_school,
      school_specialty_type: fields.school_specialty_type,
      preschool: yesNo(fields.preschool),
      oshc: fields.oshc, /* outside school hours care */
      oshc_provider: fields.oshc_provider,
      distance_education: fields.distance_education,
      intensive_english_centre: yesNo(fields.intensive_english_centre),
      latitude: fields.latitude,
      longitude: fields.longitude,
      established: function () {
        // try to return something human friendly if we can parse date.
        var d = new Date(fields.date_1st_teacher);
        if (d) { return d.getFullYear(); }
        return fields.date_1st_teacher;
      },
      school_email: fields.school_email,
      homeAddress: app.address,
      homeLat: app.lat,
      homeLng: app.lng,
      distance: function () {
        // We don't always have a user location
        // (e.g. if searching for a specific school)
        // That's OK, return nothing in that case.
        if (!app.lat || !app.lng) { return; }

        var userLatLng = new L.latLng(app.lat, app.lng);
        var schoolLatLng = new L.latLng(fields.latitude, fields.longitude);
        var dist = userLatLng.distanceTo(schoolLatLng);

        // lookup distance along road network and insert it into page when the results come back.
        app.calculateRouteDistance(fields.latitude, fields.longitude, '#result-' + i + ' .route-distance');

        return "About " + app.util.roundToOne(dist / 1000) + " km";
      },
      opportunity_class: yesNo(fields.opportunity_class)
    };
  };

}());
