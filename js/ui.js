app = app || {};
app.ui = app.ui || {};

(function () {

  app.ui.resetSearchBtns = function () {
    var $btns = $('.btn.search');
    $btns.each(function () {
      // set default text
      var $btn = $(this);
      var normalText = $btn.data('default-text');
      if (normalText) {
        $btn.text(normalText);
        $btn.removeClass('working');
      } // if normalText wasn't set, button had never entered 'working' state
    });
  };

  // Put Search button in 'Working' (show status) state
  app.ui.setSearchBtnToWorking = function (btnId) {
    var $btn = $('#' + btnId);

    // if we're already working, our work here is done.
    if ($btn.html().indexOf('Working') !== -1) { return; }

    $btn.data('default-text', $btn.html());
    $btn.html('Working&hellip;');
    $btn.addClass('working');
  };

  // make it so next time user hits Tab key, they get to first input (if available)
  // this assumes templates are set up with tabindex. If they aren't,
  // this just has no effect.
  app.ui.setTabFocus = function (selector) {

    // shift focus to the first programmatically focusable item,
    // or the first normal item w/ tabindex set to zero.
    var $container = $(selector);
    var $focusable = $container.find('[tabindex="-1"]');
    if ($focusable.length < 1) {
      $focusable = $container.find('[tabindex="0"]');
    }

    $focusable.focus();
  };

  // animated scroll to and center element with specified selector
  app.ui.scrollAndCenter = function (selector) {
    var vOffset = ($(window).height() - $(selector).outerHeight()) / 2;
    var scrollTop = $(selector).offset().top - (vOffset > 0 ? vOffset : 0);
    $('html, body').animate({scrollTop: scrollTop}, 500, function scrollDone () {
      app.ui.setTabFocus(selector);
    });
  };

  app.ui.viewSchool = function(school_code, selector){
    var q = new app.Query();
    q.logCatchmentHit(school_code);
    app.ui.scrollTo(selector);

    // make the selected school's popup the next thing we'll tab to (from container with silent[1] focus),
    // but don't actually put tab focus there since it'd be distracting to non-keyboard users.
    // 1: silent because the container's style should hide the fact the focus is there.
    $(selector).find('.popup-schoolname-container').focus();
  };

  // animated scroll to element with specified selector
  app.ui.scrollTo = function (selector) {
    $('html, body').animate({
      scrollTop: $(selector).offset().top,
    }, 500, function () {
      app.ui.resetSearchBtns();
    });
  };

  // given a function (processInput), return a callback function
  // that handles the search button click in a standard way (error checking, etc)
  // and then runns the processInput function if all looks good.
  app.ui.searchBtnFunction = function (processInput) {
    return function (e) {
      e.preventDefault();

      var inputId = $(e.target).data('input');

      // Use Search button as status
      app.ui.setSearchBtnToWorking(e.target.id);

      var inputText = $('#' + inputId).val();

      if (!inputText) {
        console.log('nothing entered to search for, not trying!');
        setTimeout(function () {app.ui.resetSearchBtns(); }, 200);
      } else {
        processInput(inputText);
      }
    };
  };

}());
