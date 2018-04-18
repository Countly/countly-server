Countly = Countly || {};
Countly.onload = Countly.onload || [];
Countly.onload.push(function(){
    /*
		Helper methods which we need 
    */
    function hasClass(ele,cls) {
	  return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
	}
	function addClass(ele,cls) {
	  if (!hasClass(ele,cls)) ele.className += " "+cls;
	}
	function removeClass(ele,cls) {
	  if (hasClass(ele,cls)) {
	    var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
	    ele.className=ele.className.replace(reg,' ');
	  }
	}
	function asyncForeach(array, fn, atEnd) {
	  var at = -1;
	  function next(shouldBreak) {
	    if (shouldBreak || ++at == array.length) {
	      if (atEnd) {
	        setTimeout(atEnd);
	      }
	    } else {
	      setTimeout(fn, 0, array[at], next);
	    }
	  }
	  next();
	}
	function isValidEmail(email) { 
		return /^.+@.+\..+$/.test(email); 
	}
	
	var eventObject = {
	    "key":"[CLY]_star_rating",
			"count": 1,
			"segmentation": {
				"contactMe":false, 
				"platform":"web", 
				"app_version":1, 
				"platform_version_rate":"",
				"rating":0,
				"email":"",
				"comment":""
			}
    }

	tippy('.rating-emotion', { delay: 100, arrow: true, arrowType: 'round', duration: 250, animation: 'scale'});
	// countly feedback elements 
	var stickyButton = document.getElementById('countly-feedback');
	var modalCloseButton = document.getElementsByClassName('countly-feedback-close-icon')[0];
	var contactMeCheckbox = document.getElementById('contact-me-checkbox');
	var contactMeEmailInput = document.getElementById('contact-me-email');
	var modalEmotionImages = document.getElementsByClassName('rating-emotion');
	var sendButton = document.getElementsByClassName('disabled-send-button')[0];
	var showCommentCheckbox = document.getElementById('countly-feedback-show-comment');
	var showEmailCheckbox = document.getElementById('countly-feedback-show-email');
	var showCommentCheckboxMask = document.getElementsByClassName('countly-feedback-show-comment-checkbox')[0];
	var showEmailCheckboxMask = document.getElementsByClassName('countly-feedback-show-email-checkbox')[0];
	var continueButton = document.getElementById('continue-button');

	function showFeedbackPopup() {
		document.getElementsByClassName("modal")[0].style.display = "block";
		document.getElementsByClassName("modal-content")[0].style.display = "block";
	}
	function hideFeedbackPopup() {
		document.getElementsByClassName("modal")[0].style.display = "none";	
	}
	function hideSuccessPopup() {
		document.getElementsByClassName("success-modal")[0].style.display = "none";		
	}
	function rate(e) {
		var index = parseInt(e.target.dataset.score) - 1;
		eventObject["segmentation"].rating = parseInt(modalEmotionImages[index].getAttribute('data-score'));
		for (var i = 0; i < modalEmotionImages.length; i++) {
			removeClass(modalEmotionImages[i], 'grow');
			modalEmotionImages[i].src = 'img/' + i + '_gray.svg';
			modalEmotionImages[i].style.transform = "scale(1)";	
			addClass(modalEmotionImages[i], 'grow');
		}
		modalEmotionImages[index].src = 'img/' + index + '_color.svg';	
		modalEmotionImages[index].style.transform = "scale(1.2)";
		modalEmotionImages[index].classList.remove("grow");
		removeClass(sendButton, 'disabled-send-button');
		addClass(sendButton, 'send-button');
		sendButton.removeAttribute('disabled');
	}
	
	function showHideCommentArea() {
		if (showCommentCheckbox.getAttribute('data-state') == 0) {
			document.getElementById('countly-feedback-comment-textarea').style.display = "block";	
			showCommentCheckbox.setAttribute('data-state', 1);
			removeClass(showCommentCheckboxMask, 'fa-square-o');
			addClass(showCommentCheckboxMask, 'fa-check-square');
		} else {
			showCommentCheckbox.setAttribute('data-state', 0);
			removeClass(showCommentCheckboxMask, 'fa-check-square');
			addClass(showCommentCheckboxMask, 'fa-square-o');
			document.getElementById('countly-feedback-comment-textarea').style.display = "none";
		}
	}
	function showHideEmailArea() {
		if (showEmailCheckbox.getAttribute('data-state') == 0) {
			document.getElementById('contact-me-email').style.display = "block";	
			showEmailCheckbox.setAttribute('data-state', 1);
			removeClass(showEmailCheckboxMask, 'fa-square-o');
			addClass(showEmailCheckboxMask, 'fa-check-square');
		} else {
			showEmailCheckbox.setAttribute('data-state', 0);
			document.getElementById('contact-me-email').style.display = "none";	
			removeClass(showEmailCheckboxMask, 'fa-check-square');
			addClass(showEmailCheckboxMask, 'fa-square-o');
		} 
	}

	// TODO: verification for comment box like email 
	function sendFeedback() {
		if (showEmailCheckbox.getAttribute('data-state') == 1) {
			if(isValidEmail(document.getElementById('contact-me-email').value.trim())) {
				removeClass(document.getElementById('contact-me-email'), 'countly-feedback-verification-fail');
				eventObject["segmentation"].comment = document.getElementById('countly-feedback-comment-textarea').value;
				eventObject["segmentation"].email = document.getElementById('contact-me-email').value;
				Countly._internals.add_cly_events(eventObject);
				document.getElementsByClassName("success-modal")[0].style.display = "block";	
				document.getElementsByClassName("success-modal-content")[0].style.display = "block";	
				document.getElementsByClassName("modal")[0].style.display = "none";	
				document.getElementsByClassName("modal-content")[0].style.display = "none";		
			} else {
				addClass(document.getElementById('contact-me-email'), 'countly-feedback-verification-fail');
			}
		} else {
			eventObject["segmentation"].comment = document.getElementById('countly-feedback-comment-textarea').value;
			eventObject["segmentation"].email = document.getElementById('contact-me-email').value;
			Countly._internals.add_cly_events(eventObject);
			document.getElementsByClassName("success-modal")[0].style.display = "block";	
			document.getElementsByClassName("success-modal-content")[0].style.display = "block";	
			document.getElementsByClassName("modal")[0].style.display = "none";	
			document.getElementsByClassName("modal-content")[0].style.display = "none";		
		}
	}

	document.onkeydown = function(evt) {
	    evt = evt || window.event;
	    var isEscape = false;
	    if ("key" in evt) {
	        isEscape = (evt.key == "Escape" || evt.key == "Esc");
	    } else {
	        isEscape = (evt.keyCode == 27);
	    }
	    if (isEscape) {
	        hideFeedbackPopup();
	    }
	};


	// event handler for countly feedback show comment area checkbox
	// show hide comment area
	Countly._internals.add_event(showCommentCheckbox, 'change', showHideCommentArea);
	
	// event handler for countly feedback show comment area checkbox
	// show hide comment area
	Countly._internals.add_event(showEmailCheckbox, 'change', showHideEmailArea);

	// event handler for countly feedback sticky button
	// show modal
	Countly._internals.add_event(stickyButton, 'click', showFeedbackPopup);
	
	// event handler for countly feedback sticky button
	// show modal
	Countly._internals.add_event(continueButton, 'click', hideSuccessPopup);

	// event handler for countly feedback modal closer
	// hide modal
	Countly._internals.add_event(modalCloseButton, 'click', hideFeedbackPopup);
	
	// event handler for countly feedback sender
	// send feedback
	Countly._internals.add_event(sendButton, 'click', sendFeedback);
	
	// event handler for countly feedback emotion img
	// rate for feedback
	asyncForeach(modalEmotionImages, function(item, done) {
		Countly._internals.add_event(item, "click", function(e) {
			rate(e);
		})
		done();
	});
});


