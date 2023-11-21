module.exports = function(grunt) {

    grunt.initConfig({
        eslint: {
            options: {
                configFile: './.eslintrc.json'
            },
            target: ['./']
        },
        concat: {
            options: {
                separator: ';'
            },
            dom: {
                src: [
                    'frontend/express/public/javascripts/dom/jquery/jquery.js',
                    'frontend/express/public/javascripts/dom/jquery.form.js',
                    'frontend/express/public/javascripts/dom/tipsy/jquery.tipsy.js',
                    'frontend/express/public/javascripts/dom/jquery.noisy.min.js',
                    'frontend/express/public/javascripts/dom/jquery.sticky.headers.js',
                    'frontend/express/public/javascripts/dom/jqueryui/jquery-ui.js',
                    'frontend/express/public/javascripts/dom/jqueryui/jquery-ui-i18n.js',
                    'frontend/express/public/javascripts/dom/gridstack/gridstack-h5.js',
                    'frontend/express/public/javascripts/dom/slimScroll.min.js',
                    'frontend/express/public/javascripts/dom/jquery.easing.1.3.js',
                    'frontend/express/public/javascripts/dom/dataTables/js/jquery.dataTables.js',
                    'frontend/express/public/javascripts/dom/dataTables/js/ZeroClipboard.js',
                    'frontend/express/public/javascripts/dom/dataTables/js/TableTools.js',
                    'frontend/express/public/javascripts/dom/pace/pace.min.js',
                    'frontend/express/public/javascripts/dom/drop/tether.min.js',
                    'frontend/express/public/javascripts/dom/drop/drop.min.js'
                ],
                dest: 'frontend/express/public/javascripts/min/countly.dom.concat.js'
            },
            utils: {
                src: [
                    'frontend/express/public/javascripts/utils/polyfills.js',
                    'frontend/express/public/javascripts/utils/underscore-min.js',
                    'frontend/express/public/javascripts/utils/lodash.merge.js',
                    'frontend/express/public/javascripts/utils/prefixfree.min.js',
                    'frontend/express/public/javascripts/utils/moment/moment-with-locales.min.js',
                    'frontend/express/public/javascripts/utils/handlebars.js',
                    'frontend/express/public/javascripts/utils/backbone-min.js',
                    'frontend/express/public/javascripts/utils/jquery.i18n.properties.js',
                    'frontend/express/public/javascripts/utils/jstz.min.js',
                    'frontend/express/public/javascripts/utils/store+json2.min.js',
                    'frontend/express/public/javascripts/utils/jquery.idle-timer.js',
                    'frontend/express/public/javascripts/utils/textcounter.min.js',
                    'frontend/express/public/javascripts/utils/initialAvatar.js',
                    'frontend/express/public/javascripts/utils/jquery.amaran.min.js',
                    'frontend/express/public/javascripts/utils/jquery.titlealert.js',
                    'frontend/express/public/javascripts/utils/jquery.hoverIntent.minified.js',
                    'frontend/express/public/javascripts/utils/tooltipster/tooltipster.bundle.min.js',
                    'frontend/express/public/javascripts/utils/highlight/highlight.pack.js',
                    'frontend/express/public/javascripts/utils/dropzone.js',
                    'frontend/express/public/javascripts/utils/webfont.js',
                    'frontend/express/public/javascripts/utils/selectize.min.js',
                    'frontend/express/public/javascripts/utils/leaflet.js',
                    'frontend/express/public/javascripts/utils/js-deep-equals.unsorted.min.js',
                    'frontend/express/public/javascripts/utils/polyfill/es6-promise.auto.min.js',
                    'frontend/express/public/javascripts/utils/polyfill/intersection-observer.js',
                    'frontend/express/public/javascripts/utils/vue/vue.min.js',
                    'frontend/express/public/javascripts/utils/vue/composition-api.min.js',
                    'frontend/express/public/javascripts/utils/vue/vuex.min.js',
                    'frontend/express/public/javascripts/utils/echarts.5.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue-echarts.umd.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue-color.min.js',
                    'frontend/express/public/javascripts/utils/vue/v-tooltip.min.js',
                    'frontend/express/public/javascripts/utils/vue/vee-validate.full.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue-clipboard.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue-good-table.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue2Dropzone.min.js',
                    'frontend/express/public/javascripts/utils/vue/element-ui.js',
                    'frontend/express/public/javascripts/utils/vue/vue2-leaflet.min.js',
                    'frontend/express/public/javascripts/utils/vue/inViewportMixin.js',
                    'frontend/express/public/javascripts/utils/vue/vuescroll.min.js',
                    'frontend/express/public/javascripts/utils/vue/vue-json-pretty.min.js',
                    'frontend/express/public/javascripts/utils/jquery.xss.js',
                    'frontend/express/public/javascripts/countly/countly.common.js',
                    'frontend/express/public/javascripts/utils/simpleUpload.min.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/codemirror.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/javascript.min.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/json2.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/jsonlint.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/minify.json.js',
                    'frontend/express/public/javascripts/utils/jsoneditor/jsoneditor.js',
                    'frontend/express/public/javascripts/utils/Sortable.min.js',
                    'frontend/express/public/javascripts/utils/vue/vuedraggable.umd.min.js',
                    'frontend/express/public/javascripts/utils/countly.checkbox.js',
                    'frontend/express/public/javascripts/utils/lodash.mergeWith.js',
                    'frontend/express/public/javascripts/utils/element-tiptap.umd.min.js'
                ],
                dest: 'frontend/express/public/javascripts/min/countly.utils.concat.js'
            },
            visualization: {
                src: [
                    'frontend/express/public/javascripts/visualization/jquery.peity.min.js',
                    'frontend/express/public/javascripts/visualization/jquery.sparkline.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.tickrotor.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.pie.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.resize.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.stack.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.spline.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.crosshair.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.orderBars.js',
                    'frontend/express/public/javascripts/visualization/flot/jquery.flot.navigate.js',
                    'frontend/express/public/javascripts/visualization/gauge.min.js',
                    'frontend/express/public/javascripts/visualization/d3/d3.min.js',
                    'frontend/express/public/javascripts/visualization/rickshaw/rickshaw.min.js',
                    'frontend/express/public/javascripts/visualization/rickshaw/rickshaw.x.axis.js'
                ],
                dest: 'frontend/express/public/javascripts/min/countly.visualization.concat.js'
            },
            lib: {
                src: [
                    'frontend/express/public/javascripts/countly/countly.auth.js',
                    'frontend/express/public/javascripts/countly/countly.helpers.js',
                    'frontend/express/public/javascripts/countly/countly.map.helper.js',
                    'frontend/express/public/javascripts/countly/countly.event.js',
                    'frontend/express/public/javascripts/countly/countly.session.js',
                    'frontend/express/public/javascripts/countly/countly.city.js',
                    'frontend/express/public/javascripts/countly/countly.location.js',
                    'frontend/express/public/javascripts/countly/countly.device.list.js',
                    'frontend/express/public/javascripts/countly/countly.device.osmapping.js',
                    'frontend/express/public/javascripts/countly/countly.device.js',
                    'frontend/express/public/javascripts/countly/countly.device.detail.js',
                    'frontend/express/public/javascripts/countly/countly.app.version.js',
                    'frontend/express/public/javascripts/countly/countly.carrier.js',
                    'frontend/express/public/javascripts/countly/countly.total.users.js',
                    'frontend/express/public/javascripts/countly/countly.app.users.js',
                    'frontend/express/public/javascripts/countly/countly.view.js',
                    'frontend/express/public/javascripts/countly/countly.cms.js',
                    'frontend/express/public/javascripts/countly/vue/core.js',
                    'frontend/express/public/javascripts/countly/vue/container.js',
                    'frontend/express/public/javascripts/countly/countly.template.js',
                    'frontend/express/public/javascripts/countly/vue/helpers.js',
                    'frontend/express/public/javascripts/countly/vue/data/vuex.js',
                    'frontend/express/public/javascripts/countly/countly.task.manager.js',
                    'frontend/express/public/javascripts/countly/vue/imports.js',
                    'frontend/express/public/javascripts/countly/vue/components/nav.js',
                    'frontend/express/public/javascripts/countly/vue/components/layout.js',
                    'frontend/express/public/javascripts/countly/vue/components/form.js',
                    'frontend/express/public/javascripts/countly/vue/components/date.js',
                    'frontend/express/public/javascripts/countly/vue/components/dropdown.js',
                    'frontend/express/public/javascripts/countly/vue/components/input.js',
                    'frontend/express/public/javascripts/countly/vue/datatable-legacy.js',
                    'frontend/express/public/javascripts/countly/vue/components/datatable.js',
                    'frontend/express/public/javascripts/countly/vue/components/dialog.js',
                    'frontend/express/public/javascripts/countly/vue/components/drawer.js',
                    'frontend/express/public/core/notes/javascripts/countly.models.js',
                    'frontend/express/public/core/notes/javascripts/countly.common.notes.js',
                    'frontend/express/public/javascripts/countly/vue/components/vis.js',
                    'frontend/express/public/javascripts/countly/vue/components/helpers.js',
                    'frontend/express/public/javascripts/countly/vue/components/sidebar.js',
                    'frontend/express/public/javascripts/countly/vue/components/progress.js',
                    'frontend/express/public/javascripts/countly/vue/directives/scroll-shadow.js',
                    'frontend/express/public/javascripts/countly/vue/legacy.js',
                    'frontend/express/public/javascripts/countly/countly.vue.legacy.js',
                    'frontend/express/public/javascripts/countly/countly.token.manager.js',
                    'frontend/express/public/javascripts/countly/countly.version.history.js',
                    'frontend/express/public/javascripts/countly/countly.analytics.js',
                    'frontend/express/public/javascripts/countly/countly.views.js',
                    'frontend/express/public/core/device-and-type/javascripts/countly.models.js',
                    'frontend/express/public/core/device-and-type/javascripts/countly.views.js',
                    'frontend/express/public/core/user-activity/javascripts/countly.models.js',
                    'frontend/express/public/core/user-activity/javascripts/countly.views.js',
                    'frontend/express/public/core/session-overview/javascripts/countly.models.js',
                    'frontend/express/public/core/session-overview/javascripts/countly.views.js',
                    'frontend/express/public/core/session-durations/javascripts/countly.models.js',
                    'frontend/express/public/core/session-durations/javascripts/countly.views.js',
                    'frontend/express/public/core/session-frequency/javascripts/countly.models.js',
                    'frontend/express/public/core/session-frequency/javascripts/countly.views.js',
                    'frontend/express/public/core/app-version/javascripts/countly.views.js',
                    'frontend/express/public/core/jobs/javascripts/countly.views.js',
                    'frontend/express/public/core/report-manager/javascripts/countly.views.js',
                    'frontend/express/public/core/app-resolution/javascripts/countly.views.js',
                    'frontend/express/public/core/platform/javascripts/countly.views.js',
                    'frontend/express/public/core/carrier/javascripts/countly.models.js',
                    'frontend/express/public/core/carrier/javascripts/countly.views.js',
                    'frontend/express/public/core/events/javascripts/countly.details.models.js',
                    'frontend/express/public/core/events/javascripts/countly.details.views.js',
                    'frontend/express/public/core/events/javascripts/countly.overview.models.js',
                    'frontend/express/public/core/events/javascripts/countly.overview.views.js',
                    'frontend/express/public/core/user-management/javascripts/countly.models.js',
                    'frontend/express/public/core/user-management/javascripts/countly.views.js',
                    'frontend/express/public/core/app-management/javascripts/countly.models.js',
                    'frontend/express/public/core/app-management/javascripts/countly.views.js',
                    'frontend/express/public/core/logs/javascripts/countly.views.js',
                    'frontend/express/public/core/token-manager/javascripts/countly.views.js',
                    'frontend/express/public/core/geo-countries/javascripts/countly.cities.models.js',
                    'frontend/express/public/core/geo-countries/javascripts/countly.models.js',
                    'frontend/express/public/core/user-analytics-overview/javascripts/countly.views.js',
                    'frontend/express/public/core/geo-countries/javascripts/countly.views.js',
                    'frontend/express/public/core/geo-countries/javascripts/countly.widgets.geo.js',
                    'frontend/express/public/core/home/javascripts/countly.models.js',
                    'frontend/express/public/core/home/javascripts/countly.views.js',
                    'frontend/express/public/core/notes/javascripts/countly.views.js',
                    'frontend/express/public/core/version-history/javascripts/countly.views.js',
                    'frontend/express/public/core/onboarding/javascripts/countly.models.js',
                    'frontend/express/public/core/onboarding/javascripts/countly.views.js'
                ],
                dest: 'frontend/express/public/javascripts/min/countly.lib.concat.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! Countly <%= grunt.template.today("dd-mm-yyyy") %> */\n',
                mangle: {
                    reserved: ["$super"]
                }
            },
            dist: {
                files: {
                    'frontend/express/public/javascripts/min/countly.dom.js': 'frontend/express/public/javascripts/min/countly.dom.concat.js',
                    'frontend/express/public/javascripts/min/countly.utils.js': 'frontend/express/public/javascripts/min/countly.utils.concat.js',
                    'frontend/express/public/javascripts/min/countly.visualization.js': 'frontend/express/public/javascripts/min/countly.visualization.concat.js',
                    'frontend/express/public/javascripts/min/countly.lib.js': 'frontend/express/public/javascripts/min/countly.lib.concat.js'
                }
            }
        },
        copy: {},
        cssmin: {
            dist: {
                files: {
                    'frontend/express/public/stylesheets/main.min.css': [
                        'frontend/express/public/stylesheets/main.css',
                        'frontend/express/public/stylesheets/vue/clyvue.css',
                        'frontend/express/public/stylesheets/vue/vue-json-pretty.css',
                        'frontend/express/public/stylesheets/amaranjs/amaran.min.css',
                        'frontend/express/public/stylesheets/selectize/selectize.css',
                        'frontend/express/public/stylesheets/leaflet/leaflet.css',
                        'frontend/express/public/stylesheets/jsoneditor/codemirror.css',
                        'frontend/express/public/stylesheets/countly-checkbox/countly.checkbox.css',
                        'frontend/express/public/javascripts/dom/tipsy/tipsy.css',
                        'frontend/express/public/javascripts/dom/gridstack/gridstack.css',
                        'frontend/express/public/javascripts/visualization/rickshaw/rickshaw.min.css',
                        'frontend/express/public/javascripts/dom/pace/pace-theme-flash.css',
                        'frontend/express/public/javascripts/dom/drop/drop-theme-countly.min.css',
                        'frontend/express/public/javascripts/utils/tooltipster/tooltipster.bundle.min.css',
                        'frontend/express/public/stylesheets/bulma/bulma-custom.css',
                        'frontend/express/public/stylesheets/styles/manifest.css',
                        'frontend/express/public/stylesheets/vue/element-tiptap.css',
                    ]
                }
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    timeout: 50000
                },
                src: ['test/*/*.js']
            }
        },
        mocha_nyc: {
            coverage: {
                src: ['test/*/*.js'], // a folder works nicely
                options: {
                    coverage: true, // this will make the grunt.event.on('coverage') event listener to be triggered
                    mask: '*.js',
                    excludes: ['bin/*', 'frontend/*', 'extend/*', 'Gruntfile.js', 'test/*'],
                    mochaOptions: ['--harmony', '--async-only', '--reporter', 'spec', '--timeout', '50000', '--exit'],
                    nycOptions: ['--harmony', '--clean', 'false'], //,'--include-all-sources' '--all'
                    reportFormats: ['none']
                }
            }
        },
        istanbul_check_coverage: {
            default: {
                options: {
                    coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
                    check: {
                        lines: 80,
                        statements: 80
                    }
                }
            }
        },
        sass: { // Task
            dist: { // Target
                options: { // Target options
                    style: 'compressed',
                    update: false // only compile when scss file is newer than css file
                },
                files: [
                    { src: 'frontend/express/public/stylesheets/vue/clyvue.scss', dest: 'frontend/express/public/stylesheets/vue/clyvue.css' },
                    { src: 'frontend/express/public/stylesheets/styles/manifest.scss', dest: 'frontend/express/public/stylesheets/styles/manifest.css' },
                    { expand: true, src: ['plugins/*/frontend/public/stylesheets/**/*.scss'], ext: '.css', extDot: 'first' }
                ]
            }
        },
        watch: {
            scripts: {
                files: ['plugins/*/frontend/public/stylesheets/**/*.scss',
                    "frontend/express/public/core/*/stylesheets/**/*.scss",
                    "frontend/express/public/stylesheets/styles/**/*.scss"
                ],
                tasks: ['sass']
            },
        }
    });

    //code coverage
    grunt.event.on('coverage', function(lcovFileContents, done) {
        // Check below on the section "The coverage event"
        done();
    });
    grunt.loadNpmTasks('grunt-mocha-nyc');
    grunt.registerTask('coverage', ['mocha_nyc:coverage']);
    //-----------code coverage-----------

    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['mochaTest']);

    grunt.registerTask('dist', ['sass', 'concat', 'uglify', 'cssmin']);

    grunt.registerTask('plugins', 'Minify plugin JS / CSS files and copy images', function() {
        var plugins = require('./plugins/plugins.json'), js = [], css = [], img = [], fs = require('fs'), path = require('path');
        console.log('Preparing production files for following plugins: %j', plugins);

        if (plugins.indexOf('drill') !== -1 && plugins.indexOf('users') !== -1 && plugins.indexOf('push') !== -1) {
            var index = Math.min(plugins.indexOf('drill'), plugins.indexOf('users'));
            plugins.splice(plugins.indexOf('push'), 1);
            plugins.splice(index, 0, "push");
        }

        if (plugins.indexOf('push') !== -1) {
            if (plugins.indexOf('geo') !== -1) {
                plugins.splice(plugins.indexOf('geo'), 1);
                plugins.push('geo');
            }
            if (plugins.indexOf('push_approver') !== -1) {
                plugins.splice(plugins.indexOf('push_approver'), 1);
                plugins.push('push_approver');
            }
        }

        if (plugins.indexOf('drill') !== -1) {
            if (plugins.indexOf('cohorts') !== -1) {
                plugins.splice(plugins.indexOf('cohorts'), 1);
                plugins.push('cohorts');
            }
            if (plugins.indexOf('funnels') !== -1) {
                plugins.splice(plugins.indexOf('funnels'), 1);
                plugins.push('funnels');
            }
            if (plugins.indexOf('formulas') !== -1) {
                plugins.splice(plugins.indexOf('formulas'), 1);
                plugins.push('formulas');
            }
        }

        if (plugins.indexOf('plugins') !== -1) {
            plugins.splice(plugins.indexOf('plugins'), 1);
            plugins.unshift('plugins');
        }


        plugins.forEach(function(plugin) {
            var files, pluginPath = path.join(__dirname, 'plugins', plugin),
                javascripts = path.join(pluginPath, 'frontend/public/javascripts'),
                stylesheets = path.join(pluginPath, 'frontend/public/stylesheets'),
                images = path.join(pluginPath, 'frontend/public/images', plugin);

            if (fs.existsSync(javascripts) && fs.statSync(javascripts).isDirectory()) {
                files = fs.readdirSync(javascripts);
                if (files.length) {
                    // move models and views to the bottom
                    if (files.indexOf('countly.models.js') !== -1) {
                        files.splice(files.indexOf('countly.models.js'), 1);
                        files.push('countly.models.js');
                    }
                    if (files.indexOf('countly.widgets.js') !== -1) {
                        files.splice(files.indexOf('countly.widgets.js'), 1);
                        files.push('countly.widgets.js');
                    }
                    if (files.indexOf('countly.views.js') !== -1) {
                        files.splice(files.indexOf('countly.views.js'), 1);
                        files.push('countly.views.js');
                    }
                    files.forEach(function(name) {
                        var file = path.join(javascripts, name);
                        if (fs.statSync(file).isFile() && name.indexOf('.') !== 0 && name.endsWith('.js')) {
                            js.push('plugins/' + plugin + '/frontend/public/javascripts/' + name);
                        }
                    });
                }
            }

            if (fs.existsSync(stylesheets) && fs.statSync(stylesheets).isDirectory()) {
                files = fs.readdirSync(stylesheets);
                files.forEach(function(name) {
                    var file = path.join(stylesheets, name);
                    if (fs.statSync(file).isFile() && name !== 'pre-login.css' && name.indexOf('.') !== 0 && name.endsWith('.css')) {
                        css.push('plugins/' + plugin + '/frontend/public/stylesheets/' + name);
                    }
                });
            }

            try {
                if (fs.existsSync(images) && fs.statSync(images).isDirectory()) {
                    img.push({ expand: true, cwd: 'plugins/' + plugin + '/frontend/public/images/' + plugin + '/', filter: 'isFile', src: '**', dest: 'frontend/express/public/images/' + plugin + '/' });
                }
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
        });

        grunt.config('copy.plugins.files', img);

        grunt.config('concat.plugins.src', js);
        grunt.config('concat.plugins.dest', 'frontend/express/public/javascripts/min/countly.plugins.concat.js');

        grunt.config('uglify.plugins.files.frontend/express/public/javascripts/min/countly\\.plugins\\.js', 'frontend/express/public/javascripts/min/countly.plugins.concat.js');

        grunt.config('cssmin.plugins.files.frontend/express/public/stylesheets/plugins\\.min\\.css', css);

        // grunt.task.loadTasks(['copy:plugins', 'concat:plugins', 'uglify:plugins']);
        // grunt.task.run(['concat', 'uglify']);
        grunt.task.run(['concat:plugins', 'uglify:plugins', 'copy:plugins', 'sass', 'cssmin:plugins']);

        console.log('Done preparing production files');
    });

    grunt.registerTask('locales', 'Concat all locale files into one', function() {
        var plugins = require('./plugins/plugins.json'), locales = {}, fs = require('fs'), path = require('path');
        console.log('Preparing locale files for core & plugins: %j', plugins);

        var pushLocaleFile = function(name, path) {
            var lang = '';
            name = name.replace('.properties', '');
            if (name.indexOf('_') !== -1) {
                lang = name.split('_').pop();
                if (lang.length > 3 || lang === "en") {
                    lang = '';
                }
            }

            if (!locales[lang]) {
                locales[lang] = [];
            }

            locales[lang].push(path);
        };

        function processLocaleDir(dir) {
            if (!fs.existsSync(dir)) {
                return;
            }
            fs.readdirSync(dir).forEach(function(name) {
                var file = path.join(dir, name);
                if (fs.statSync(file).isFile() && name.indexOf('.') !== 0) {
                    pushLocaleFile(name, dir + '/' + name);
                }
            });
        }

        [path.join(__dirname, 'frontend/express/public/localization/dashboard'), path.join(__dirname, 'frontend/express/public/localization/help'), path.join(__dirname, 'frontend/express/public/localization/mail')].forEach(processLocaleDir);

        plugins.forEach(function(plugin) {
            var localization = path.join(__dirname, 'plugins', plugin, 'frontend/public/localization');

            try {
                if (fs.statSync(localization).isDirectory()) {
                    fs.readdirSync(localization).forEach(function(name) {
                        var file = path.join(localization, name);
                        if (fs.statSync(file).isFile() && name.indexOf('.') !== 0) {
                            pushLocaleFile(name, 'plugins/' + plugin + '/frontend/public/localization/' + name);
                        }
                    });
                }
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
        });

        processLocaleDir(path.join(__dirname, 'frontend/express/public/localization/custom'));

        for (var lang in locales) {
            grunt.config('concat.locales_' + lang + '.options.separator', '\n\n');
            grunt.config('concat.locales_' + lang + '.src', locales[lang]);
            grunt.config('concat.locales_' + lang + '.dest', 'frontend/express/public/localization/min/locale' + (lang.length ? '_' + lang : '') + '.properties');
            grunt.task.run('concat:locales_' + lang);
        }

        console.log('Done preparing locale files');
    });

    grunt.registerTask('dist-all', ['dist', 'plugins', 'locales']);

};