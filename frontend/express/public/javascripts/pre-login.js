/**
 * Javascript file loaded on pre login pages with some handy global functions
 * @name Pre Login
 * @global
 * @namespace Pre Login
 */
 

/**
* This method is called to show user a message, like error when loging in. By default this is taken from query parameter or passed to template directly as message variable
* @param {string} key - key from localization property file
* @memberof Pre Login
*/
function showMessage(key) {
	$("#message").data("localize", key);
	$("#message").html(jQuery.i18n.map[key]);
}

/**
* By default only pre-login property file localization is available on prelogin pages, but you can additionally load other localization files, like for example needed for your plugin, using this function
* @param {string} name - base name of the property file without the locale/language. Should be the same name as your plugin
* @param {string} path - url path to where the localization file currently resides relative to the page you want to load it from
* @param {function} callback - callback executed when localization file is loaded
* @memberof Pre Login
* @example
* addLocalization('enterpriseinfo', countlyGlobal["cdn"]+'enterpriseinfo/localization/');
*/
function addLocalization(name, path, callback){
    var langs = jQuery.i18n.map;
    var lang = store.get("countly_lang") || "en";
    jQuery.i18n.properties({
		name:name, 
		path:[path],
		mode:'map',
		language: lang,
		callback: function() {
			$.each(jQuery.i18n.map, function(key, value) {
				langs[key] = value;
			});
            jQuery.i18n.map = langs;
			
			$("[data-localize]").each(function() {
				var elem = $(this),
					localizedValue = jQuery.i18n.map[elem.data("localize")];
				
				if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
					elem.attr("placeholder", localizedValue);
				} else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
					elem.attr("value", localizedValue);
				} else {
					elem.html(jQuery.i18n.map[elem.data("localize")]);
				}
			});
            if(callback)
                callback();
		}
	});
    $(document).bind('clyLangChange', function() {
        addLocalization(name, path, callback);
    });
}

$(document).ready(function() {

	var lang = "en";
	if (store.get("countly_lang")) {
		lang = store.get("countly_lang");
		$("#active-lang").text(lang.toUpperCase());
		$("#form-lang").val(lang);
	}
	
	jQuery.i18n.properties({
		name:'pre-login', 
		path:[countlyGlobal["cdn"]+'localization/pre-login/'],
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
					elem.html(jQuery.i18n.map[elem.data("localize")]);
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
        $("#form-lang").val(langCode);
		
		jQuery.i18n.properties({
			name:'pre-login', 
			path:[countlyGlobal["cdn"]+'localization/pre-login/'],
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
						elem.html(jQuery.i18n.map[elem.data("localize")]);
					}
				});
			}
		});
	});
});