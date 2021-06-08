// countly checkbox jQuery plugin
(function($){	
    $.fn.countlyCheckbox = function(options) {
  // support multiple elements
  if (this.length > 1){
      this.each(function() { $(this).countlyCheckbox(options) });
      return this;
  }
  
  // public methods        
  this.initialize = function() {
      // define reference dom element as variable
      var initializedBefore = typeof $(this).attr('class') !== 'undefined' ? $(this).attr('class').split(' ').indexOf('countly-checkbox-wrapper') > -1 : false;
      if (initializedBefore) {
          return this;
      }

      var ref = this;
      var hasLabel = $(ref).attr('data-label') ? true : false;
      // add wrapper class
      ref.addClass('countly-checkbox-wrapper');
      // set default state
      ref.attr('data-checked', false);
      
      // prepare required dom elements
      var checkIcon = '<i class="fas fa-check countly-checkbox-icon"></i>';
      var nativeCheckbox = '<input type="checkbox" id="cc-' + $(ref).attr('id') + '" class="countly-checkbox-native"/>';
      var label = '<span class="countly-checkbox-label">' + $(ref).attr('data-label') + '</span>';
      // add required dom elements
      ref.append(checkIcon);
      ref.append(nativeCheckbox);
      if (hasLabel) ref.after(label);
      
      // add event handlers
      $('body').off('click', '.countly-checkbox-wrapper').on('click', '.countly-checkbox-wrapper', function() {
          // is checkbox checked?
          var checkedState = $(this).find('.countly-checkbox-native')[0].checked;
          // make ui changes
          if (checkedState) {
              $(this).addClass('countly-checkbox-checked');
              $(this).find('.countly-checkbox-icon').css('opacity', 1);
          }
          else {
              $(this).removeClass('countly-checkbox-checked');
              $(this).find('.countly-checkbox-icon').css('opacity', 0);
          }
          // update ref data attribute
          $(this).attr('data-checked', checkedState);
      });
      return this;
  };

  this.set = function(val) {
      // make ui changes
      if (val) {
          $(this).addClass('countly-checkbox-checked');
          $(this).find('.countly-checkbox-icon').css('opacity', 1);
      }
      else {
          $(this).removeClass('countly-checkbox-checked');
          $(this).find('.countly-checkbox-icon').css('opacity', 0);
      }
      // update ref data attribute
      $(this).attr('data-checked', val);
      $(this).find('.countly-checkbox-native')[0].checked = val;
      return this;
  };

  this.get = function() {
      return $(this).find('.countly-checkbox-native')[0].checked;
  };

  this.setDisabled = function() {
      $(this).addClass('countly-checkbox-disabled');
      $(this).find('.countly-checkbox-native').attr('disabled','disabled');
  }

  this.unsetDisabled = function() {
      $(this).removeClass('countly-checkbox-disabled');
      $(this).find('.countly-checkbox-native').removeAttr('disabled');
  }

  return this.initialize();
    };
})(jQuery);