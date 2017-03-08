var app, L;
app = app || {};

(function () {

  app.debug = false; // set to false in production environment - relates to console logging in util.js

  // CartoDB configuration
  app.db = {
    points: 'dec_schools', //table
    polygons: 'catchments', //table
    user: 'cesensw'
  };

  // Map configuration variables
  app.geo = {
    // tiles: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    tiles: 'https://api.tiles.mapbox.com/v4/mapbox.emerald/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiY2VzZW5zdyIsImEiOiJjaW8zamRlbzcwMHk2dmJsendjeTYxdGN6In0.gNq5On98ylthoEij2OfVjg',
    //dark: https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png'
    attribution: 'Mapbox <a href="https://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
    // CartoCSS for various map layers
    backgroundCSS: '{polygon-fill: #F0F0F0; polygon-opacity: 0; line-color: #7E599D; line-width: 0.3; line-opacity: 1; line-dasharray: 10,4;}',
    catchmentCSS: '{polygon-fill: #0B6138; polygon-opacity: 0.15; line-color: #0B6138; line-width: 2; line-opacity: 1; }',
    catchmentCSS1ary: '{polygon-fill: #FE9A2E; polygon-opacity: 0.15; line-color: #FE9A2E; line-width: 2; line-opacity: 1; line-offset:2; }',

    // Specify a Maki icon name, hex color, and size (s, m, or l).
    // An array of icon names can be found in L.MakiMarkers.icons or at https://www.mapbox.com/maki/
    // Lowercase letters a-z and digits 0-9 can also be used. A value of null will result in no icon.
    // Color may also be set to null, which will result in a gray marker.
    pickedIcon: L.MakiMarkers.icon({icon: 'school', color: '#d72d6c', size: 'l'}),
    pickedIcons: {
      ssp: L.MakiMarkers.icon({icon: 'school', color: '#a441b2', size: 'l'}),
      // TODO: that green looks like the active primary color for color blind people.
      primary: L.MakiMarkers.icon({icon: 'school', color: '#e65c5c', size: 'l'}),
      secondary: L.MakiMarkers.icon({icon: 'school', color: '#279644', size: 'l'}),
      central: L.MakiMarkers.icon({icon: 'school', color: '#a441b2', size: 'l'}),
      infants: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'l'}),
      environmental: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'l'}),
      other: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'l'}),
    },
    resultIcon: L.MakiMarkers.icon({icon: 'school', color: '#d72d6c', size: 'm'}),
    resultIcons: {
      ssp: L.MakiMarkers.icon({icon: 'school', color: '#a441b2', size: 'm'}),
      // TODO: that green looks like the active primary color for color blind people.
      primary: L.MakiMarkers.icon({icon: 'school', color: '#e65c5c', size: 'm'}),
      secondary: L.MakiMarkers.icon({icon: 'school', color: '#279644', size: 'm'}),
      central: L.MakiMarkers.icon({icon: 'school', color: '#a441b2', size: 'm'}),
      infants: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'm'}),
      environmental: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'm'}),
      other: L.MakiMarkers.icon({icon: 'school', color: '#2a4ce0', size: 'm'}),
    },
    nearbyIcon: L.MakiMarkers.icon({icon: 'school', color: '#F5B4CC', size: 'm', opacity: 0.5}),
    nearbyIcons: {
      ssp: L.MakiMarkers.icon({icon: 'school', color: '#da99e3', size: 'm', opacity: 0.5}),
      // TODO: that green looks like the active primary color for color blind people.
      primary: L.MakiMarkers.icon({icon: 'school', color: '#ff9191', size: 'm', opacity: 0.5}),
      secondary: L.MakiMarkers.icon({icon: 'school', color: '#6ba87b', size: 'm', opacity: 0.5}),
      central: L.MakiMarkers.icon({icon: 'school', color: '#DA99E3', size: 'm', opacity: 0.5}),
      infants: L.MakiMarkers.icon({icon: 'school', color: '#2e93c9', size: 'm', opacity: 0.5}),
      environmental: L.MakiMarkers.icon({icon: 'school', color: '#2e93c9', size: 'm', opacity: 0.5}),
      other: L.MakiMarkers.icon({icon: 'school', color: '#2e93c9', size: 'm', opacity: 0.5}),
    },
    homeIcon:   L.MakiMarkers.icon({icon: 'building', color: '#39acc9', size: 'm'}),
  };

  app.config = {
    searchRadius: 105 * 1000, // maximum distance (meters) someone would be expected to travel to any school before we suggest distance schools
    nearbyLimit: 5, // when searching for schools 'nearby', this is the max number to explicitely highlight
    geoProvider: 'google', // whether to use google or mapbox for geocoder, distance matrix
    defaultZoom: 12, // 12: a good city level zoom (on Google & Mapbox) for any time we don't have a better idea
    maxBounds: { // for handling edge cases or when we need a default.
      east: 153.85,
      north: -27.9, // <--- n/e/s/w: these are bounds around New South Wales (NSW)
      south: -37.84,
      west: 140.62
    }
  };

  app.config.geocoder = {
    // center search on Sydney - vertically center of state + population centered around there
    center: {
      lat: -33.8688,
      lng: 151.2093
    },
    country: 'au', // au = Australia
    // bbox: '140.6,-37.52,153.96,-27.9', // bounding box around NSW
    mapboxToken: 'pk.eyJ1IjoidGVjaGllc2hhcmsiLCJhIjoiYzk2ZEFWTSJ9.8ZY6rG2BWXkDBmvAPvn_nw'
  };

  // app.analytics = { // unused currently
  //   url: "http://localhost:8080"
  // };

  app.supports = [
    { id: 0, shortcode: 'ignoreme' },
    { id: 1, shortcode: 'AU', filter: 'Autism', long_description: 'students with autism'},
    { id: 2, shortcode: 'BD', filter: 'Behaviour disorder', long_description: 'students with behaviour disorder'},
    { id: 3, shortcode: 'DB', filter: 'Deaf or blind', long_description: 'students with deafness or hearing impairment and blindness or vision impairment'},
    { id: 4, shortcode: 'EI', filter: 'Early intervention', long_description: 'students with early intervention support needs'},
    { id: 5, shortcode: 'ED', filter: 'Emotional disturbance', long_description: 'students with emotional disturbance'},
    { id: 6, shortcode: 'H', filter: 'Hearing impairment', long_description: 'students with deafness or hearing impairment'},
    { id: 7, shortcode: 'ID', filter: 'Intellectual disability', long_description: 'students with intellectual disability'},
    { id: 8, shortcode: 'Multicategorical', filter: 'Multicategorical', long_description: 'students with a range of disabilities with similar support needs'},
    { id: 9, shortcode: 'P', filter: 'Physical disability', long_description: 'students with physical disability'},
    { id: 10, shortcode: 'Tut', filter: 'Tutorial Centre', long_description: 'Tutorial Centre for students with intensive behaviour and educational support needs'},
    { id: 11, shortcode: 'V', filter: 'Vision impairment', long_description: 'students with blindness or vision impairment'},
  ];

}());
