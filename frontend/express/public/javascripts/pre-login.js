function showMessage(key) {
	$("#message").text(jQuery.i18n.map[key]);
}

function showInstruction(x) {
	var InstructionTitle;
	var InstructionImg;
	var InstructionContent;

    x=x%3;

	switch(x) {
		case 0:
            InstructionTitle="sdnfkldslkmkcl msckmdskm dfmsmldsl;dsfldsm";
            InstructionImg="/images/dashboard/bg.png";
            InstructionContent="We've conducted a careful analysis of the ways in which Wikihelp was successful in meeting your needs, and we've concluded that we can do better. Accordingly, we have retired the site and migrated the content.";
            break;
		case 1:
            InstructionTitle="Content2";
            InstructionImg="/images/dashboard/logo_bg.png";
            InstructionContent="We've conducted a careful analysis of the ways in which Wikihelp was successful in meeting your needs, and we've concluded that we can do better. Accordingly, we have retired the site and migrated the content.";
		    break;
		case 2:
		    InstructionTitle="Content3";
            InstructionContent="We've conducted a careful analysis of the ways in which Wikihelp was successful in meeting your needs, and we've concluded that we can do better. Accordingly, we have retired the site and migrated the content.";
            InstructionImg="/images/dashboard/menu_bg.png";
		    break;
	}

	$("#InstructionMessage").html("<img  src='"+InstructionImg+"'/><div class='InstructionMsg'>"+InstructionContent+"</div>");
}

$(document).ready(function() {

	var lang = "en";
	if (store.get("countly_lang")) {
		lang = store.get("countly_lang");
		$("#active-lang").text(lang.toUpperCase());
	}
	
	jQuery.i18n.properties({
		name:'pre-login', 
		path:'/localization/pre-login/',
		mode:'map',
		language: lang,
		callback: function() {
			// Localization test
			//$.each(jQuery.i18n.map, function(key, value) {
			//	jQuery.i18n.map[key] = key;
			//});
			
			$("[data-localize]").each(function() {
				var elem = $(this),
					localizedValue = jQuery.i18n.map[elem.data("localize")];
				
				if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
					elem.attr("placeholder", localizedValue);
				} else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
					elem.attr("value", localizedValue);
				} else {
					elem.text(jQuery.i18n.map[elem.data("localize")]);
				}
			});
		}
	});

	$('body').noisy({
		intensity: 0.9, 
		size: 50, 
		opacity: 0.02,
		monochrome: true
	});
	
	$("#reset-password-form").submit(function() {
		if ($("input[name=password]").val() != $("input[name=again]").val()) {
			$("body").prepend($("<div>").attr("id", "message").text(jQuery.i18n.map["reset.dont-match"]));
			return false;
		}
	});
	
	$("#select-lang").click(function() {
		$(this).toggleClass("active");
	});
	
	$("#langs .item").click(function(){
		var langCode = $(this).data("language-code"),
			langCodeUpper = langCode.toUpperCase();
		
		store.set("countly_lang", langCode);
		$("#active-lang").text(langCodeUpper);
		
		jQuery.i18n.properties({
			name:'pre-login', 
			path:'/localization/pre-login/',
			mode:'map',
			language: langCode,
			callback: function() {
				// Localization test
				//$.each(jQuery.i18n.map, function(key, value) {
				//	jQuery.i18n.map[key] = key;
				//});
				
				$(document).trigger('clyLangChange');
				
				$("[data-localize]").each(function() {
					var elem = $(this),
						localizedValue = jQuery.i18n.map[elem.data("localize")];
					
					if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
						elem.attr("placeholder", localizedValue);
					} else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
						elem.attr("value", localizedValue);
					} else {
						elem.text(jQuery.i18n.map[elem.data("localize")]);
					}
				});
			}
		});
	});

	function ScaleSlider() {
        var parentWidth = jssor_slider2.$Elmt.parentNode.clientWidth;

        if (parentWidth) {
            var sliderWidth = parentWidth;

            //keep the slider width no more than 602
            sliderWidth = Math.min(sliderWidth, 602);

            jssor_slider2.$SetScaleWidth(sliderWidth);
        } else {
            $JssorUtils$.$Delay(ScaleSlider, 30);
        }
    }
});