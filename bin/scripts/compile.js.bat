java -jar closure-compiler.jar ^
--js=../frontend/express/public/javascripts/dom/jquery/jquery-1.8.3.min.js ^
--js=../frontend/express/public/javascripts/dom/jquery.form.js ^
--js=../frontend/express/public/javascripts/dom/tipsy/jquery.tipsy.js ^
--js=../frontend/express/public/javascripts/dom/jquery.noisy.min.js ^
--js=../frontend/express/public/javascripts/dom/jquery.sticky.headers.js ^
--js=../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-1.8.22.custom.min.js ^
--js=../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-i18n.js ^
--js=../frontend/express/public/javascripts/dom/slimScroll.min.js ^
--js=../frontend/express/public/javascripts/dom/jquery.easing.1.3.js ^
--js=../frontend/express/public/javascripts/dom/jsonlite.js ^
--js=../frontend/express/public/javascripts/dom/dataTables/js/jquery.dataTables.js ^
--js=../frontend/express/public/javascripts/dom/dataTables/js/ZeroClipboard.js ^
--js=../frontend/express/public/javascripts/dom/dataTables/js/TableTools.js ^
--js_output_file=../frontend/express/public/javascripts/min/countly.dom.js

java -jar closure-compiler.jar ^
--js=../frontend/express/public/javascripts/utils/underscore-min.js ^
--js=../frontend/express/public/javascripts/utils/prefixfree.min.js ^
--js=../frontend/express/public/javascripts/utils/moment/moment.min.js ^
--js=../frontend/express/public/javascripts/utils/moment/moment.isocalendar.min.js ^
--js=../frontend/express/public/javascripts/utils/moment/lang-all.min.js ^
--js=../frontend/express/public/javascripts/utils/handlebars.js ^
--js=../frontend/express/public/javascripts/utils/backbone-min.js ^
--js=../frontend/express/public/javascripts/utils/jquery.i18n.properties-min-1.0.9.js ^
--js=../frontend/express/public/javascripts/utils/jstz.min.js ^
--js=../frontend/express/public/javascripts/utils/store+json2.min.js ^
--js=../frontend/express/public/javascripts/utils/jquery.idle-timer.js ^
--js=../frontend/express/public/javascripts/utils/textcounter.min.js ^
--js=../frontend/express/public/javascripts/utils/initialAvatar.js ^
--js=../frontend/express/public/javascripts/utils/messenger/messenger.js ^
--js=../frontend/express/public/javascripts/utils/messenger/messenger-theme-future.js ^
--js=../frontend/express/public/javascripts/countly/countly.common.js ^
--js_output_file=../frontend/express/public/javascripts/min/countly.utils.js

java -jar closure-compiler.jar ^
--js=../frontend/express/public/javascripts/visualization/jquery.peity.min.js ^
--js=../frontend/express/public/javascripts/visualization/flot/jquery.flot.js ^
--js=../frontend/express/public/javascripts/visualization/flot/jquery.flot.tickrotor.js ^
--js=../frontend/express/public/javascripts/visualization/flot/jquery.flot.pie.js ^
--js=../frontend/express/public/javascripts/visualization/flot/jquery.flot.resize.js ^
--js=../frontend/express/public/javascripts/visualization/flot/jquery.flot.stack.js ^
--js=../frontend/express/public/javascripts/visualization/gauge.min.js ^
--js=../frontend/express/public/javascripts/visualization/d3/d3.v2.min.js ^
--js=../frontend/express/public/javascripts/visualization/d3/d3.layout.min.js ^
--js=../frontend/express/public/javascripts/visualization/rickshaw/rickshaw.min.js ^
--js_output_file=../frontend/express/public/javascripts/min/countly.visualization.js

java -jar closure-compiler.jar ^
--js=../frontend/express/public/javascripts/countly/countly.map.helper.js ^
--js=../frontend/express/public/javascripts/countly/countly.event.js ^
--js=../frontend/express/public/javascripts/countly/countly.session.js ^
--js=../frontend/express/public/javascripts/countly/countly.city.js ^
--js=../frontend/express/public/javascripts/countly/countly.location.js ^
--js=../frontend/express/public/javascripts/countly/countly.user.js ^
--js=../frontend/express/public/javascripts/countly/countly.device.js ^
--js=../frontend/express/public/javascripts/countly/countly.device.detail.js ^
--js=../frontend/express/public/javascripts/countly/countly.app.version.js ^
--js=../frontend/express/public/javascripts/countly/countly.carrier.js ^
--js=../frontend/express/public/javascripts/countly/countly.allapps.js ^
--js=../frontend/express/public/javascripts/countly/countly.template.js ^
--js_output_file=../frontend/express/public/javascripts/min/countly.lib.js