app = app || {};

// White Label version

(function() {
  // bit of a hack for now, but change to false on official site (or don't include this file)
  // https://github.com/CodeforAustralia/school-finder/issues/349
  app.whitelabel = true;

  if (app.whitelabel) {
    // white label version doesn't get official logo
    $('.org-logo').empty();
  }
}());
