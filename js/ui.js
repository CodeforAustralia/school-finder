var app;
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
    var $btn = $("#" + btnId);

    // if we're already working, our work here is done.
    if ($btn.html().indexOf('Working') !== -1) { return; }

    $btn.data('default-text', $btn.html());
    $btn.html('Working&hellip;');
    $btn.addClass("working");
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

      var inputText = $("#" + inputId).val();

      if (!inputText) {
        console.log('nothing entered to search for, not trying!');
        setTimeout(function () {app.ui.resetSearchBtns(); }, 200);
      } else {
        processInput(inputText);
      }
    };
  };

}());
