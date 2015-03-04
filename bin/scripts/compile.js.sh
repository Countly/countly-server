DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

java -jar $DIR/closure-compiler.jar \
--js=$DIR/../../frontend/express/public/javascripts/dom/jquery/jquery-1.8.3.min.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jquery.form.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/tipsy/jquery.tipsy.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jquery.noisy.min.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jquery.sticky.headers.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-1.8.22.custom.min.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-i18n.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/slimScroll.min.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/jquery.easing.1.3.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/dataTables/js/jquery.dataTables.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/dataTables/js/ZeroClipboard.js \
--js=$DIR/../../frontend/express/public/javascripts/dom/dataTables/js/TableTools.js \
--js_output_file=$DIR/../../frontend/express/public/javascripts/min/countly.dom.js

java -jar $DIR/closure-compiler.jar \
--js=$DIR/../../frontend/express/public/javascripts/utils/underscore-min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/prefixfree.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/moment/moment.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/moment/moment.isocalendar.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/moment/lang-all.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/handlebars.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/backbone-min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/jquery.i18n.properties-min-1.0.9.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/jstz.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/store+json2.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/jquery.idle-timer.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/textcounter.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/initialAvatar.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/jquery.amaran.min.js \
--js=$DIR/../../frontend/express/public/javascripts/utils/jquery.titlealert.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.common.js \
--js_output_file=$DIR/../../frontend/express/public/javascripts/min/countly.utils.js

java -jar $DIR/closure-compiler.jar \
--js=$DIR/../../frontend/express/public/javascripts/visualization/jquery.peity.min.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/flot/jquery.flot.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/flot/jquery.flot.tickrotor.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/flot/jquery.flot.pie.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/flot/jquery.flot.resize.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/flot/jquery.flot.stack.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/gauge.min.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/d3/d3.v2.min.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/d3/d3.layout.min.js \
--js=$DIR/../../frontend/express/public/javascripts/visualization/rickshaw/rickshaw.min.js \
--js_output_file=$DIR/../../frontend/express/public/javascripts/min/countly.visualization.js

java -jar $DIR/closure-compiler.jar \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.map.helper.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.event.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.session.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.city.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.location.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.user.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.device.list.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.device.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.device.detail.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.app.version.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.carrier.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.allapps.js \
--js=$DIR/../../frontend/express/public/javascripts/countly/countly.template.js \
--js_output_file=$DIR/../../frontend/express/public/javascripts/min/countly.lib.js