'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment, vprop, countlyCommon, $ */

window.component('push.popup', function (popup) {
    var C = window.components,
        t = C.t,
        push = C.push;

    popup.show = function (prefilled, duplicate) {
        if (!push.dashboard) {
            return push.remoteDashboard(countlyCommon.ACTIVE_APP_ID).then(function () {
                popup.show(prefilled, duplicate);
            });
        }
        m.startComputation();
        var message = new push.Message(prefilled || {});
        if (!duplicate) {
            message.sound('default');
            if (message.auto()) {
                message.autoOnEntry(true);
                message.autoCapMessages(2);
                message.autoCapSleep(1000 * 3600 * 24);
            }
        }

        if (message.platforms().length && message.apps().length) {
            var found = false;
            message.platforms().forEach(function (p) {
                message.apps().forEach(function (a) {
                    if (p === 'i' && window.countlyGlobal.apps[a] && window.countlyGlobal.apps[a].apn && window.countlyGlobal.apps[a].apn.length) {
                        found = true;
                    } else if (p === 'a' && window.countlyGlobal.apps[a] && window.countlyGlobal.apps[a].gcm && window.countlyGlobal.apps[a].gcm.length) {
                        found = true;
                    }
                });
            });

            if (!found) {
                m.endComputation();
                return window.CountlyHelpers.alert(t('push.error.no-credentials'), 'red');
            }
        }

        if (message.auto() && (!push.dashboard.cohorts || !push.dashboard.cohorts.length)) {
            m.endComputation();
            return window.CountlyHelpers.alert(t('push.error.no-cohorts'), 'red');
        }

        push.popup.slider = C.slider.show({
            key: 'meow',
            title: function () {
                var els = [
                    t('pu.po.title')
                ];
                return m('h3', els);
            },
            desc: message.auto() ? t('pu.po.desc').replace('4', '5') : t('pu.po.desc'),
            // onclose: function() {
            //  console.log('slider closed');
            // },
            component: C.push.popup,
            componentOpts: message,
            loadingTitle: function () {
                return message.count() ? message.saved() ? t('pu.po.sent') : t('pu.po.sending') : t('pu.po.loading');
            },
            loadingDesc: function () {
                return message.count() ? message.saved() ? t('pu.po.sent-desc') : t('pu.po.sending-desc') : t('pu.po.loading-desc');
            },
        });
        m.endComputation();
    };

    popup.controller = function (message) {
        var popup = this, apps = [], cohorts = [];

        if (message.auto()) {
            cohorts = push.dashboard.cohorts.map(function (cohort) {
                return new C.selector.Option({ value: cohort._id, title: cohort.name, selected: false });
            }); 
        }

        // t.set('pu.po.tab1.title', t('pu.po.tab1.title' + !!window.countlyGeo));

        this.message = message;
        this.renderTab = function (i, active) {
            var tab;
            if ((message.auto() && i <= 2) || (!message.auto() && i <= 1)) {
                tab = 'tab' + i;
            } else {
                if ((message.auto() && i === 3) || (!message.auto() && i === 2)) {
                    tab = 'compose';
                } else if ((message.auto() && i === 4) || (!message.auto() && i === 3)) {
                    tab = 'review';
                }
            }

            return m('.comp-push-tab', { class: active && !popup.warnNoUsers() ? 'active' : '' }, [
                popup.warnNoUsers() ?
                    i < 2 ? push.ICON.WARN('comp-push-tab-warn') : m('.comp-push-tab-num', i + 1)
                    // i < 2 ? m('svg.comp-push-tab-warn[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')) : m('.comp-push-tab-num', i + 1)
                    : i < this.tabs.tab() ? m('.comp-push-tab-num.ion-checkmark') : m('.comp-push-tab-num', i + 1),
                m('.comp-push-tab-title', t('pu.po.' + tab + '.title' + (message.auto() ? '.auto' : ''), t('pu.po.' + tab + '.title'))),
                m('.comp-push-tab-desc', t('pu.po.' + tab + '.desc' + (message.auto() ? '.auto' : ''), t('pu.po.' + tab + '.desc')))
            ]);
        };

        for (var k in window.countlyGlobal.apps) {
            var a = window.countlyGlobal.apps[k];
            if ((a.apn && a.apn.length) || (a.gcm && a.gcm.length)) {
                apps.push(new C.selector.Option({ value: a._id, title: a.name, selected: message.apps().indexOf(a._id) !== -1 }));
            }
        }

        this.previewPlatform = m.prop(message.platforms() && message.platforms().length ? message.platforms()[0] : push.C.PLATFORMS.IOS);
        this.warnNoUsers = m.prop(false);

        this.tabenabled = function (tab) {
            if (this.tabs.tab() >= tab) {
                return true;
            }

            var enabled = true;
            if ((message.auto() && tab >= 4) || (!message.auto() && tab >= 3)) {
                if (message.type() === push.C.TYPE.MESSAGE) {
                    enabled = enabled && message.messagePerLocale().default;
                } else if (message.type() === push.C.TYPE.DATA) {
                    enabled = enabled && message.data.valid;
                }
                if ((message.sound() !== undefined && !message.sound.valid) ||
                    (message.badge() !== undefined && !message.badge.valid) ||
                    (message.url() !== undefined && !message.url.valid) ||
                    (message.media() !== undefined && !message.media.valid) ||
                    (message.buttons() > 0 && (!message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 't'] || !message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l'] || !push.URL_REGEXP.test(message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l']))) ||
                    (message.buttons() > 1 && (!message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 't'] || !message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l'] || !push.URL_REGEXP.test(message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l']))) ||
                    (message.data() !== undefined && !message.data.valid)) {
                    enabled = false;
                }
            }
            if (enabled && message.auto() && tab >= 3) {
                if (message.autoDelay() === null ||
                    message.autoTime() === null ||
                    message.autoCapMessages() === null || 
                    message.autoCapSleep() === null) {
                    enabled = false;
                }
            }
            if (enabled && !message.auto() && tab >= 2) {
                if (message.date() === null) {
                    enabled = enabled && !!message.date();
                }
            }
            if (enabled && message.auto() && tab >= 2) {
                if ((message.autoCohorts().length === 0) ||
                    message.date() === null ||
                    message.autoEnd() === null) {
                    enabled = false;
                }
            }
            if (enabled) {
                enabled = enabled && message.platforms().length && message.apps().length;
            }

            return enabled;
        }.bind(this);

        this.checkForNoUsers = function (final) {
            if (!message.count()) {
                this.warnNoUsers(true);

                var swtch = function (tab, ev) {
                    ev.preventDefault();
                    this.tabs.customComponent = null;
                    this.warnNoUsers(false);
                    popup.tabs.set(tab);
                };
                this.tabs.customComponent = {
                    view: function () {
                        return m('.comp-push-no-users', [
                            m('.comp-push-no-users-zero', '0'),
                            m('.comp-push-no-users-text', [
                                t('pu.po.no-users'),
                                m('br'),
                                t('pu.po.no-users-try-change') + ' ',
                                m('a[href=#]', { onclick: swtch.bind(popup, 0) }, t('pu.po.no-users-try-change-apps') + '.'),
                                m('br'),
                                m('a.btn-next[href=#]', { onclick: swtch.bind(popup, 0) }, t('pu.po.no-users-start-over'))
                            ])
                        ]);
                    }
                };
            } else if (this.warnNoUsers()) {
                this.tabs.customComponent = null;
                this.warnNoUsers(false);
                popup.tabs.set(2);
            }

            if (final === true && localesController) {
                localesController.relocale();
            }
        };

        this.next = function (ev, tab) {
            if (ev) { ev.preventDefault(); }

            tab = typeof tab === 'undefined' ? this.tabs.tab() + 1 : tab;
            if (this.tabenabled(tab)) {
                // if (!message.auto() && tab >= 2) {
                //  if (!message.schedule() && (message.date() !== undefined || message.tz() !== false)) {
                //      message.date(undefined);
                //      message.tz(false);
                //  }
                // }
                if (((message.auto() && tab >= 3) || (!message.auto() && tab >= 2)) && !message.count()) {
                    C.slider.instance.loading(true);
                    message.remotePrepare(this.checkForNoUsers.bind(this, true)).then(function () {
                        setTimeout(function () {
                            m.startComputation();
                            C.slider.instance.loading(false);
                            this.checkForNoUsers();
                            if (message.count() && this.tabenabled(tab)) {
                                popup.tabs.set(tab);
                            }
                            m.endComputation();
                        }.bind(this), 400);
                    }.bind(this), C.slider.instance.loading.bind(C.slider.instance, false));
                } else {
                    this.tabs.customComponent = null;
                    this.warnNoUsers(false);
                    popup.tabs.set(tab);
                }

                C.slider.instance.onresize();
            }
        }.bind(this);

        this.prev = function (ev) {
            ev.preventDefault();
            if (this.tabs.tab() > 0) {
                this.tabs.set(popup.tabs.tab() - 1);
                C.slider.instance.onresize();
            }
        }.bind(this);

        this.send = function (ev) {
            ev.preventDefault();
            if (!message.ack()) { return; }
            C.slider.instance.loading(true);
            message.remoteCreate().then(function () {
                message.saved(true);

                setTimeout(function () {
                    m.startComputation();
                    C.slider.instance.close();
                    if (window.app.activeView.mounted) {
                        window.app.activeView.mounted.refresh();
                    }

                    m.endComputation();
                }, 1000);
            }, function (error) {
                C.slider.instance.loading(false);
                window.alert(error.error || error.result || error);
            });
            // setTimeout(function(){
            //  m.startComputation();
            //  message.saved(true);
            //  m.endComputation();

            //  setTimeout(function(){
            //      m.startComputation();
            //      C.slider.instance.loading(false);
            //      m.endComputation();
            //  }, 1000);
            // }, 1000);

        }.bind(this);

        var activeLocale = m.prop('default'), localesController, mtitle, mmessage, defMtitle, defMmessage,
            messageTitleHTML = function (locale) {
                if (arguments.length > 1) {
                    if (locale === 'default') {
                        defMtitle = arguments[1];
                    } else {
                        mtitle = arguments[1];
                    }
                }
                return locale === 'default' ? defMtitle : mtitle;
            },
            messageMessageHTML = function (locale) {
                if (arguments.length > 1) {
                    if (locale === 'default') {
                        defMmessage = arguments[1];
                    } else {
                        mmessage = arguments[1];
                    }
                }
                return locale === 'default' ? defMmessage : mmessage;
            };

        function buttonTitle(index, key, locale) {
            var k = (locale || activeLocale()) + (index === undefined ? (push.C.S + key) : (push.C.S + index + push.C.S + key));

            return vprop(message.messagePerLocale()[k] || (index === undefined ? undefined : key === 't' && (locale || activeLocale()) === 'default' ? t('pu.po.tab2.mbtn.' + (index + 1)) : undefined), function (v) {
                return !!v;
            }, t('pu.po.tab2.mbtn.req'), function (v) {
                k = (locale || activeLocale()) + (index === undefined ? (push.C.S + key) : (push.C.S + index + push.C.S + key));

                if (arguments.length) {
                    message.messagePerLocale()[k] = v;
                }

                return message.messagePerLocale()[k];
            });
        }

        var locales = {
            controller: function () {
                var self = this;

                this.text = m.prop();
                this.ontab = function (tab) {
                    activeLocale(this.locales[tab].value);
                    this.text(message.messagePerLocale()[this.locales[tab].value]);
                }.bind(this);
                this.ontext = function (text) {
                    this.text(text);
                    if (text) {
                        message.messagePerLocale()[this.locales[this.tabs.tab()].value] = text;
                    } else {
                        delete message.messagePerLocale()[this.locales[this.tabs.tab()].value];
                    }
                }.bind(this);

                this.relocale = function () {
                    this.locales = message.locales().map(function (l, i) {
                        l = Object.assign({}, l);
                        l.messageTitle = buttonTitle(undefined, 't', l.value);
                        l.messageMessage = function () {
                            if (arguments.length) {
                                if (arguments[0]) {
                                    message.messagePerLocale()[l.value] = arguments[0];
                                } else {
                                    delete message.messagePerLocale()[l.value];
                                }
                            }
                            return message.messagePerLocale()[l.value];
                        };
                        l.buttonTitle0 = buttonTitle(0, 't', l.value);
                        l.buttonTitle1 = buttonTitle(1, 't', l.value);
                        l.buttonUrl0 = buttonTitle(0, 'l', l.value);
                        l.buttonUrl1 = buttonTitle(1, 'l', l.value);

                        l.titleCtrl = new C.emoji.controller({ key: 't' + l.value, value: l.messageTitle, valueHTML: messageTitleHTML.bind(null, l.value), placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.mtitle.placeholder') : messageTitleHTML('default') || t('pu.po.tab2.mtitle.placeholder'); } });
                        l.messageCtrl = new C.emoji.controller({ key: 'm' + l.value, value: l.messageMessage, valueHTML: messageMessageHTML.bind(null, l.value), textarea: true, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.placeholder') : messageMessageHTML('default') || t('pu.po.tab2.placeholder'); } });

                        l.btn0t = new C.input.controller({ value: l.buttonTitle0, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.btntext') : message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 't']; } });
                        l.btn1t = new C.input.controller({ value: l.buttonTitle1, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.btntext') : message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 't']; } });

                        l.btn0l = new C.input.controller({ value: l.buttonUrl0, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.urlordeep') : message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l']; } });
                        l.btn1l = new C.input.controller({ value: l.buttonUrl1, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.urlordeep') : message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l']; } });

                        l.tab = function () {
                            var checkmark;
                            if (l.value === 'default') {
                                var error = '';
                                if (!l.messageMessage()) {
                                    error = 'pu.po.tab2.default-message.invalid';
                                } else if (message.buttons() > 0 && !message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 't']) {
                                    error = 'pu.po.tab2.default-button-title.invalid';
                                } else if (message.buttons() > 0 && (!message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l'] || !push.URL_REGEXP.test(message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l']))) {
                                    error = 'pu.po.tab2.default-button-link.invalid';
                                } else if (message.buttons() > 1 && !message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 't']) {
                                    error = 'pu.po.tab2.default-button-title.invalid';
                                } else if (message.buttons() > 1 && (!message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l'] || !push.URL_REGEXP.test(message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l']))) {
                                    error = 'pu.po.tab2.default-button-link.invalid';
                                }
                                var config = C.tooltip.config(t(error));
                                config.key = error;
                                config.appendToBody = true;
                                checkmark = !error ? m('span.ion-checkmark') : m('.error', C.tooltip.config(t(error)), push.ICON.WARN());
                            } else {
                                var found = false, mpl = message.messagePerLocale();
                                [l.value, l.value + push.C.S + 't', l.value + push.C.S + '0' + push.C.S + 't', l.value + push.C.S + '0' + push.C.S + 'l', l.value + push.C.S + '1' + push.C.S + 't', l.value + push.C.S + '1' + push.C.S + 'l'].forEach(function (k) {
                                    if (mpl[k]) { found = true; }
                                });
                                checkmark = found ? m('span.ion-checkmark') : '';
                            }
                            return m('div', { class: self.tabs.tab() === i ? 'active' : '' }, [
                                // message.locales()[l] ? m('.comp-push-tab-num.ion-checkmark') : 
                                m('span.comp-push-locale-count',
                                    l.value === 'default' ?
                                        m('.help-tt', m('span.ion-information-circled', C.tooltip.config(t('pu.po.tab2.default-message.help'))))
                                        : (l.percent + '%')
                                ),
                                m('span.comp-push-locale-title', l.title),
                                checkmark
                            ]);
                        };
                        l.view = function () {
                            return m('div', { key: 'locale-' + l.value }, [
                                m('.emoji', [
                                    m('h6', t('pu.po.tab2.mtitle')),
                                    C.emoji.view(l.titleCtrl)
                                ]),
                                m('.emoji', [
                                    m('h6', t('pu.po.tab2.mtext')),
                                    C.emoji.view(l.messageCtrl)
                                ]),
                                message.buttons() > 0 ?
                                    m('div', [
                                        m('h6', t('pu.po.tab2.mbtn')),
                                        message.buttons() > 0 ?
                                            m('.custom-button', [
                                                m('h6', '#1'),
                                                m('div', [
                                                    C.input.view(l.btn0t),
                                                    l.buttonTitle0() && !l.buttonTitle0.valid ?
                                                        m('.error', C.tooltip.config(t('pu.po.tab2.mbtn.req')), push.ICON.WARN())
                                                        : '',
                                                ]),
                                                m('div', [
                                                    C.input.view(l.btn0l),
                                                    l.buttonUrl0() && !l.buttonUrl0.valid ?
                                                        m('.error', C.tooltip.config(t('pu.po.tab2.mbtn.url')), push.ICON.WARN())
                                                        : ''
                                                ])
                                            ])
                                            : '',
                                        message.buttons() > 1 ?
                                            m('.custom-button', [
                                                m('h6', '#2'),
                                                m('div', [
                                                    C.input.view(l.btn1t),
                                                    l.buttonTitle1() && !l.buttonTitle1.valid ?
                                                        m('.error', C.tooltip.config(t('pu.po.tab2.mbtn.req')), push.ICON.WARN())
                                                        : '',
                                                ]),
                                                m('div', [
                                                    C.input.view(l.btn1l),
                                                    l.buttonUrl1() && !l.buttonUrl1.valid ?
                                                        m('.error', C.tooltip.config(t('pu.po.tab2.mbtn.url')), push.ICON.WARN())
                                                        : ''
                                                ])
                                            ])
                                            : '',
                                    ])
                                    : '',
                            ]);
                        };
                        return l;
                    });
                    this.tabs = new C.tabs.controller(this.locales, { ontab: this.ontab });
                };
                this.relocale();
                this.ontab(0);
            },
            view: function (ctrl) {
                return m('.comp-push-locales', { class: 'buttons-' + message.buttons() }, [
                    C.tabs.view(ctrl.tabs),
                ]);
            },
        };

        var extra = {
            controller: function (opts) {
                this.title = opts.title;
                this.titlePlaceholder = opts.titlePlaceholder;
                this.value = opts.value;
                this.valuePlaceholder = opts.valuePlaceholder;
                this.typ = opts.typ || 'text';
                this.help = opts.help;
                this.textarea = opts.textarea;
                this.oncheck = function (ev) {
                    if (ev && ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
                        return true;
                    }
                    this.value(this.value() !== undefined ? undefined : (typeof opts.def === 'undefined' ? '' : opts.def));
                    return true;
                }.bind(this);
                this.onchange = function (val) {
                    if (opts.converter) {
                        var v = opts.converter(val);
                        if (v !== null) {
                            this.value(v);
                        } else {
                            this.value(undefined);
                        }
                    }
                }.bind(this);
            },

            view: function (ctrl) {
                var check = {
                    onchange: ctrl.oncheck
                };
                if (ctrl.value() !== undefined) { check.checked = 'checked'; }

                var inp = {
                    value: ctrl.value() === undefined ? '' : ctrl.value(),
                    oninput: m.withAttr('value', ctrl.value),
                    onchange: m.withAttr('value', ctrl.onchange),
                    placeholder: ctrl.value() !== undefined ? ctrl.valuePlaceholder || '' : ''
                };
                if (ctrl.value() === undefined) { inp.disabled = 'disabled'; }

                return m('.comp-push-extra', { class: !ctrl.textarea || ctrl.value() === undefined ? '' : 'expanded' }, [
                    m('.comp-push-extra-check', { onclick: ctrl.oncheck }, [
                        m('input[type=checkbox]', check),
                        m('label', typeof ctrl.title === 'string' ?
                            ctrl.title :
                            [
                                m('input', { onclick: function () { ctrl.value(ctrl.value() || ''); }, oninput: m.withAttr('value', ctrl.title), placeholder: ctrl.titlePlaceholder }, ctrl.title() || ''),
                                ctrl.title() !== undefined && !ctrl.title.valid ?
                                    m('.error', C.tooltip.config(ctrl.title.errorText), push.ICON.WARN())
                                    : ''
                            ]
                        ),
                        ctrl.help ? m('.help-tt', C.tooltip.config(ctrl.help), m('span.ion-information-circled')) : ''
                    ]),
                    m('.comp-push-extra-value', {
                        class: ctrl.value() === undefined ? '' : 'active', onclick: function () {
                            if (ctrl.value() === undefined) { ctrl.oncheck(); }
                        }
                    }, [
                            m(ctrl.textarea ? 'textarea' : 'input[type=' + ctrl.typ + ']', inp),
                            ctrl.value() !== undefined && !ctrl.value.valid ?
                                m('.error', C.tooltip.config(ctrl.value.errorText), push.ICON.WARN())
                                : ''
                        ])
                ]);
            }
        };

        var tabs = [
            // Apps & Platforms
            {
                tab: this.renderTab.bind(this, 0),
                controller: function () {
                    // this.appsSelector = new C.multiselect.controller({
                    //  options: apps,
                    //  value: function () {
                    //      if (arguments.length) {
                    //          var selectedApps = apps.filter(function (o) { return o.selected(); });

                    //          message.apps(selectedApps.map(function (o) { return o.value(); }));
                    //          message.appNames(selectedApps.map(function (o) { return o.title(); }));

                    //          if (!message.apps().length) {
                    //              message.platforms([]);
                    //          } else {
                    //              message.platforms(message.availablePlatforms());
                    //          }
                    //      }
                            
                    //      return apps;
                    //  }
                    // });

                    this.onplatform = function (p, ev) {
                        if (ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
                            return true;
                        }
                        var i = message.platforms().indexOf(p);
                        if (i === -1) {
                            message.platforms(message.platforms().concat([p]));
                        } else {
                            message.platforms(message.platforms().filter(function (pl) { return pl !== p; }));
                        }
                        popup.previewPlatform(message.platforms()[0]);
                        return true;
                    };

                    this.selectGeos = new C.singleselect.controller({
                        options: [{ value: undefined, title: t('pu.po.tab1.geos.no') }].concat(push.dashboard.geos.map(function (geo) {
                            return { value: geo._id, title: geo.title };
                        })),
                        value: message.geo
                    });

                    this.radioTest = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab1.testing-prod') },
                            { value: true, title: t('pu.po.tab1.testing-test'), desc: t('pu.po.tab1.testing-test-desc') }
                        ], value: message.test
                    });
                },

                view: function (ctrl) {
                    var platforms = message.availablePlatforms();
                    return m('.comp-push-tab-content', [
                        m('.comp-panel', [
                            // message.auto() ? '' : m('.form-group', [
                            //  m('h4', t('pu.po.tab0.select-apps')),
                            //  C.multiselect.view(ctrl.appsSelector),
                            //  // C.tagselector.view(ctrl.appsSelector),
                            //  m('.desc', t('pu.po.tab0.select-apps-desc'))
                            // ]),
                            m('.form-group', [
                                m('h4', t('pu.po.tab0.select-platforms')),
                                !platforms.length ? m('.help.pulsating', t('pu.po.tab0.select-platforms-no')) : platforms.map(function (p) {
                                    var o = { value: p, onchange: ctrl.onplatform.bind(ctrl, p) };
                                    if (message.platforms().indexOf(p) !== -1) {
                                        o.checked = 'checked';
                                    }

                                    return m('.comp-push', { onclick: ctrl.onplatform.bind(ctrl, p) }, [
                                        m('input[type="checkbox"]', o),
                                        m('label', t('pu.platform.' + p))
                                    ]);
                                })
                            ]),
                            !message.auto() && push.dashboard.geos && push.dashboard.geos.length ?
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.geos')),
                                    C.singleselect.view(ctrl.selectGeos),
                                    m('.desc', t('pu.po.tab1.geos-desc')),
                                ])
                                : '',
                            m('.form-group', [
                                m('h4', t('pu.po.tab1.testing')),
                                C.radio.view(ctrl.radioTest),
                                m('.desc', t('pu.po.tab1.testing-desc')),
                            ]),
                            m('.btns', {key: 'btns'}, [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(1) ? false : 'disabled' }, t('pu.po.next')),
                                m('a.btn-prev', { href: '#', onclick: function (ev) { C.slider.instance.close(ev); } }, t('pu.po.close'))
                            ])
                        ])

                    ]);
                }
            }
        ];

        if (message.auto()) {
            // Campaign Rules
            tabs.push({
                tab: this.renderTab.bind(this, 1),
                controller: function () {
                    this.selectCohorts = new C.multiselect.controller({
                        placeholder: t('pu.po.tab1.select-cohort-placeholder'),
                        options: cohorts,
                        value: function () {
                            if (arguments.length) {
                                message.autoCohorts(cohorts.filter(function (o) { return o.selected(); }).map(function(o){ return o.value(); }));
                            }
                            return cohorts;
                        }
                    });
                    this.radioType = new C.radio.controller({
                        options: [
                            { value: true, title: t('pu.po.tab1.trigger-type.entry'), desc: t('pu.po.tab1.cohort-entry-desc') },
                            { value: false, title: t('pu.po.tab1.trigger-type.exit'), desc: t('pu.po.tab1.cohort-exit-desc') }
                        ], value: message.autoOnEntry
                    });

                    this.radioStartDate = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab1.scheduling-auto-now') },
                            {
                                value: true, title: t('pu.po.tab1.scheduling-date'), view: function () {
                                    if (!this.datepicker) {
                                        var d = new Date();
                                        d.setHours(d.getHours() + 1);
                                        d.setMinutes(0);
                                        d.setSeconds(0);
                                        d.setMilliseconds(0);
                                        this.datepicker = C.datepicker.controller({ value: message.date, defaultDate: d, position: "top", id: 'campaign-start-date' });
                                    }
                                    return m('.comp-grid-cell', C.datepicker.view(this.datepicker));
                                }.bind(this)
                            },

                        ], value: function (v) {
                            if (arguments.length) {
                                if (v && message.date() === undefined) {
                                    message.date(null);
                                    this.datepicker.open(true);
                                } else if (!v) {
                                    message.date(undefined);
                                    this.datepicker.open(false);
                                }
                            }
                            return message.date() !== undefined;
                        }.bind(this)
                    });

                    var d = new Date();
                    d.setHours(d.getHours() + 1);
                    d.setMinutes(0);
                    d.setSeconds(0);
                    d.setMilliseconds(0);
                    this.dateAutoEnd = new C.datepicker.controller({
                        position: "top",
                        id: 'campaign-end-date',
                        defaultDate: d, 
                        value: message.autoEnd,
                        onclick: function() { 
                            if (message.autoEnd() === undefined) {
                                message.autoEnd(null);
                            }
                        },
                   });

                    this.checkAutoEnd = new C.checkbox.controller({
                        class: 'comp-grid-row',
                        group: 'comp-grid-cell',
                        title: t('pu.po.tab1.campaign-end-date'),
                        undeNullValue: message.autoEnd,
                        undeNullOnChange: function(value){
                            if (value === null) {
                                this.dateAutoEnd.open(true);
                            } else if (value === undefined) {
                                this.dateAutoEnd.open(false);
                            }
                        }.bind(this),
                        view: C.datepicker.view.bind(null, this.dateAutoEnd)
                    });
                },
                view: function (ctrl) {
                    return m('.comp-push-tab-content',
                        m('.comp-panel', [
                            m('.form-group', [
                                m('h4', t('pu.po.tab1.trigger-type')),
                                C.radio.view(ctrl.radioType)
                            ]),
                            m('.form-group', [
                                m('h4', t('pu.po.tab1.select-cohort')),
                                C.multiselect.view(ctrl.selectCohorts),
                                m('.desc', t('pu.po.tab1.select-cohort-desc')),
                            ]),
                            m('.form-group', [
                                m('h4', t('pu.po.tab1.campaign-start-date')),
                                C.radio.view(ctrl.radioStartDate)
                            ]),

                            m('.form-group', [
                                m('h4', t('pu.po.tab1.additional-options')),
                                m('.comp-grid.comp-unpadded', [
                                    C.checkbox.view(ctrl.checkAutoEnd)
                                ]),
                                m('.desc', t('pu.po.tab2.delivery-end-desc')),
                            ]),

                            m('.btns', {key: 'btns'}, [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(2) ? false : 'disabled' }, t('pu.po.next')),
                                popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                            ])
                        ]));
                }
            });

            // Message Delivery
            tabs.push({
                tab: this.renderTab.bind(this, 2),
                controller: function () {
                    this.delay = new C.delay.controller({days: true, hours: true, value: message.autoDelay});
                    this.sleep = new C.delay.controller({days: true, hours: true, value: message.autoCapSleep});
                    this.messageCapped = function(){
                        if (arguments.length) {
                            if (arguments[0]) {
                                message.autoCapMessages(5);
                                message.autoCapSleep(undefined);
                            } else {
                                message.autoCapMessages(undefined);
                                message.autoCapSleep(undefined);
                            }
                        }
                        return message.autoCapSleep() !== undefined || message.autoCapMessages() !== undefined;
                    };
                    this.messageDelayed = function(){
                        if (arguments.length && [undefined, null].indexOf(arguments[0]) !== -1) {
                            var v = arguments[0];
                            if (!(v === null && message.autoDelay())) {
                                setTimeout(function(){
                                    m.startComputation();
                                    message.autoDelay(v);
                                    this.delay.set();
                                    m.endComputation();
                                }.bind(this), 30);
                            }
                        }
                        return message.autoDelay() === undefined ? undefined : null;
                    }.bind(this);
                    this.hours = [];
                    for (var i = 0; i <= 23; i++) {
                        this.hours.push(i);
                    }

                    this.radioDelay = new C.radio.controller({
                        options: [
                            { value: undefined, title: t('pu.po.tab2.immediately'), desc: t('pu.po.tab2.immediately-desc') },
                            { value: null, title: t('pu.po.tab2.delayed'), view: function(){
                                return this.messageDelayed() === undefined ? '' : C.delay.view(this.delay);
                            }.bind(this) }
                        ], value: this.messageDelayed
                    });

                    this.selectTime = new C.singleselect.controller({
                        id: 'delivery-time',
                        class: 'time-select',
                        value: message.autoTime,
                        placeholder: t('pu.po.tab2.select-time'),
                        icon: m('i.material-icons', 'query_builder'),
                        onclick: function() { 
                            if (message.autoTime() === undefined) {
                                message.autoTime(null);
                            }
                        },
                        options: this.hours.map(function (hour) {
                            return new C.selector.Option({
                                value: hour * C.delay.MS_IN_HOUR,
                                title: (hour < 10 ? "0" + hour : hour) + ":00"
                            });
                        })
                    });

                    this.radioCap = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab2.capping.no'),  desc: t('pu.po.tab2.capping.no-desc')  },
                            { value: true,  title: t('pu.po.tab2.capping.yes'), desc: t('pu.po.tab2.capping.yes-desc') }
                        ], value: this.messageCapped
                    });

                    this.checkTime = new C.checkbox.controller({
                        class: 'comp-grid-row',
                        group: 'comp-grid-cell',
                        title: t('pu.po.tab2.send-in-user-tz'),
                        undeNullValue: message.autoTime,
                        undeNullOnChange: function(value){
                            if (value === null) {
                                this.selectTime.isOpen = true;
                            }
                        }.bind(this),
                        view: C.singleselect.view.bind(null, this.selectTime)
                    });
                },
                view: function (ctrl) {
                    return m('.comp-push-tab-content',
                        m('.comp-panel', [
                            m('.form-group', [
                                m('h4', t('pu.po.tab2.delivery-method')),
                                C.radio.view(ctrl.radioDelay),
                                m('.desc', t('pu.po.tab2.delivery-method-desc')),
                            ]),

                            m('.form-group', [
                                m('h4', t('pu.po.tab2.delivery-time')),
                                m('.comp-grid.comp-unpadded', [
                                    C.checkbox.view(ctrl.checkTime)
                                ]),
                                m('.desc', t('pu.po.tab2.delivery-time-desc')),
                            ]),

                            m('.form-group', [
                                m('h4', t('pu.po.tab2.capping')),
                                C.radio.view(ctrl.radioCap),
                                m('.desc', t('pu.po.tab2.capping-desc')),
                            ]),

                            ctrl.messageCapped() ? m('.form-group', [
                                m('.comp-grid', [
                                    m('.comp-grid-row', [
                                        m('.comp-grid-cell', t('pu.po.tab2.message-per-user')),
                                        m('.comp-grid-cell', m('.comp-delay.single', [
                                            m('input.comp-delay-days', {
                                                type: "number", 
                                                value: message.autoCapMessages(),
                                                min: 0,
                                                oninput: function(){
                                                    if (!('' + this.value).length) {
                                                        message.autoCapMessages(undefined);
                                                    } else if (('' + this.value).length && !isNaN(parseInt(this.value)) && !parseInt(this.value) >= 0) {
                                                        message.autoCapMessages(parseInt(this.value));
                                                    }
                                                },
                                                placeholder: 'unlimited'
                                            }),
                                            m('label.comp-delay-days', t.n('pu.messages', message.autoCapMessages()))
                                        ]))
                                    ])
                                ]),
                                m('.desc', t('pu.po.tab2.message-per-user-desc'))
                            ]) : '',

                            ctrl.messageCapped() ? m('.form-group', [
                                m('.comp-grid', [
                                    m('.comp-grid-row', [
                                        m('.comp-grid-cell', t('pu.po.tab2.sleep')),
                                        m('.comp-grid-cell', C.delay.view(ctrl.sleep))
                                    ])
                                ]),
                                m('.desc', t('pu.po.tab2.sleep-desc'))
                            ]) : '',

                            m('.btns', {key: 'btns'}, [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(3) ? false : 'disabled' }, t('pu.po.next')),
                                popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                            ])
                        ])
                    );
                }
            });
        } else {
            // Time & Location
            tabs.push({
                tab: this.renderTab.bind(this, 1),
                controller: function(){
                    this.radioSchedule = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab1.scheduling-now'), desc: t('pu.po.tab1.scheduling-now-desc') },
                            {
                                value: true, title: t('pu.po.tab1.scheduling-date'), view: function () {
                                    if (!this.datepicker) {
                                        var d = new Date();
                                        d.setHours(d.getHours() + 1);
                                        d.setMinutes(0);
                                        d.setSeconds(0);
                                        d.setMilliseconds(0);
                                        this.datepicker = C.datepicker.controller({ value: message.date, defaultDate: d, id: 'campaign-end-date' });
                                    }
                                    return m('.date-time-container', C.datepicker.view(this.datepicker));
                                }.bind(this)
                            }
                        ], value: function (v) {
                            if (arguments.length) {
                                if (v && message.date() === undefined) {
                                    message.date(null);
                                    this.datepicker.open(true);
                                } else if (!v) {
                                    message.date(undefined);
                                    this.datepicker.open(false);
                                }
                            }
                            return message.date() !== undefined;
                        }.bind(this)
                    });

                    this.radioTz = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.no'), desc: t('pu.po.tab1.tz-no-desc') },
                            { value: -(new Date().getTimezoneOffset()), title: t('pu.po.tab1.tz-yes'), desc: t('pu.po.tab1.tz-yes-desc') }
                        ], value: message.tz
                    });
                },
                view: function (ctrl) {
                    return m('.comp-push-tab-content', [
                        m('.comp-panel', [
                            m('.form-group', [
                                m('h4', t('pu.po.tab1.scheduling')),
                                C.radio.view(ctrl.radioSchedule),
                                m('.desc', t('pu.po.tab1.scheduling-desc')),
                            ]),
                            message.date() ?
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.tz')),
                                    m('.desc', [
                                        t('pu.po.tab1.tz-desc'),
                                        ' ',
                                        m('span.warn', C.tooltip.config(t('pu.po.tab1.tz-yes-help')), push.ICON.WARN())
                                    ]),
                                    C.radio.view(ctrl.radioTz),
                                    m('.desc', t('pu.po.tab1.scheduling-desc'))
                                ]) : '',
                            m('.btns', {key: 'btns'}, [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(2) ? false : 'disabled' }, t('pu.po.next')),
                                popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                            ])
                        ])
                    ]);
                }
            });
        }

        var viewTabIndex = tabs.length + 1;
        // Message
        tabs.push({
            tab: this.renderTab.bind(this, tabs.length),
            controller: function () {
                localesController = new locales.controller();
                this.segmentedType = new C.segmented.controller({
                    options: [
                        { value: push.C.TYPE.MESSAGE, title: t('pu.type.message') },
                        { value: push.C.TYPE.DATA, title: t('pu.type.data') },
                    ], value: message.type, class: 'comp-push-message-type', onchange: function (type) {
                        if (type === 'data' && !message.data()) { message.data(''); }
                        if (type === 'message' && message.data() === '') { message.data(undefined); }
                        if (type === 'data' && message.sound()) { message.sound(undefined); }
                        if (type === 'message' && !message.sound()) { message.sound('default'); }
                    }
                });

                this.segmentedButtons = new C.segmented.controller({
                    options: [
                        { value: 0, title: '0' },
                        { value: 1, title: '1' },
                        { value: 2, title: '2' },
                    ], value: message.buttons
                });

                this.segmentedPlatform = new C.segmented.controller({
                    class: 'platforms', options: [
                        { value: push.C.PLATFORMS.IOS, view: m.bind(m, 'span.ion-social-apple') },
                        { value: push.C.PLATFORMS.ANDROID, view: m.bind(m, 'span.ion-social-android') },
                    ].filter(function (o) { return message.platforms().indexOf(o.value) !== -1; }), value: popup.previewPlatform
                });
            },
            view: function (ctrl) {
                var d = moment();

                return m('.comp-push-tab-content', [
                    m('.comp-push-panels', [
                        m('.comp-push-panel.comp-push-panel-compose-left.comp-push-compose', [
                            m('.comp-push-panel-half', [
                                m('div', [
                                    m('h4', t('pu.po.tab2.message.type')),
                                    C.segmented.view(ctrl.segmentedType),
                                ]),
                                message.type() !== 'data' ? m('div', [
                                    m('h4', t('pu.po.tab2.mbtns')),
                                    C.segmented.view(ctrl.segmentedButtons),
                                ]) : ''
                            ]),
                            message.type() === push.C.TYPE.MESSAGE ?
                                m('.comp-push-message.comp-push-space-top', [
                                    locales.view(localesController)
                                ]) : '',
                            message.type() !== 'data' ?
                                m('div', [
                                    m('h4', [
                                        t('pu.po.tab2.mmedia'),
                                        message.media.typeWarn && message.platforms().indexOf(push.C.PLATFORMS.ANDROID) !== -1 ?
                                            m('.android-warn', [
                                                push.ICON.WARN(),
                                                message.media.typeWarn
                                            ])
                                            : ''
                                    ]),
                                    m('.comp-push-extras', m(extra, { title: t('pu.po.tab2.extras.media'), value: message.media, typ: 'url', valuePlaceholder: t('pu.po.tab2.extras.media.placeholder'), help: t('pu.po.tab2.extras.media.help') })),
                                    message.media.valid ?
                                        m('.mime', [
                                            m('.mime-type', message.media.mime || ''),
                                            m('.mime-size', message.media.mimeSize || ''),
                                        ])
                                        : m('.mime', [
                                            m('.mime-type', message.media.mime || message.media.statusErrorText || ''),
                                            m('.mime-size', message.media.mimeSize || ''),
                                        ])
                                ])
                                : '',
                            m('h4', t('pu.po.tab2.extras')),
                            m('.comp-push-extras', [
                                message.type() === 'message' ?
                                    m(extra, { title: t('pu.po.tab2.extras.sound'), value: message.sound, def: 'default' })
                                    : '',
                                m(extra, {
                                    title: t('pu.po.tab2.extras.badge'), value: message.badge, def: 0, typ: 'number', converter: function (val) {
                                        if (val === '') { return 0; }
                                        else if (isNaN(parseInt(val))) { return null; }
                                        return parseInt(val);
                                    }, help: t('pu.po.tab2.extras.badge.help')
                                }),
                                message.type() === 'message' ?
                                    m(extra, { title: t('pu.po.tab2.extras.url'), value: message.url, typ: 'url', valuePlaceholder: t('pu.po.tab2.urlordeep'), help: t('pu.po.tab2.extras.url.help') })
                                    : '',
                                m(extra, {
                                    title: t('pu.po.tab2.extras.data'), value: message.data, textarea: true, converter: function (val) {
                                        try {
                                            var o = window.jsonlite.parse(val);
                                            return typeof o === 'object' ? JSON.stringify(o) : null;
                                        } catch (e) {
                                            return null;
                                        }
                                    }, valuePlaceholder: t('pu.po.tab2.extras.data.placeholder'), help: t('pu.po.tab2.extras.data.help')
                                }),
                            ]),
                        ]),
                        message.type() === push.C.TYPE.MESSAGE ?
                            m('.comp-push-panel.comp-push-panel-compose-right.comp-push-preview', [
                                m('h4', m.trust('&nbsp;')),
                                m('.preview.preview-' + popup.previewPlatform(), [
                                    m('img', { src: '/images/push/preview.' + popup.previewPlatform() + '.png' }),
                                    // m('.preview-time', d.format('H:mm')),
                                    // m('.preview-date', d.format("dddd, MMMM DD")),
                                    m('.preview-message', [
                                        m('img', { src: 'appimages/' + message.apps()[0] + '.png' }),
                                        m('.preview-message-title', [
                                            m('span.preview-message-app', window.countlyGlobal.apps[message.apps()[0]].name),
                                            m('span.preview-message-date', popup.previewPlatform() === push.C.PLATFORMS.IOS ? 'X' : d.format('LT')),
                                        ]),
                                        popup.previewPlatform() === 'i' && message.media() && message.media.valid ?
                                            message.media.view()
                                            : '',
                                        message.messagePerLocale()[activeLocale() + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + 't'] ?
                                            m('.preview-message-message-title', { config: function (el) { el.innerHTML = (messageTitleHTML(activeLocale()) || message.messagePerLocale()[activeLocale() + push.C.S + 't']) || (messageTitleHTML('default') || message.messagePerLocale()['default' + push.C.S + 't']); } })
                                            // m('.preview-message-message-title', message.messagePerLocale()[activeLocale() + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + 't'])
                                            : '',
                                        m('.preview-message-message', { config: function (el) { el.innerHTML = (messageMessageHTML(activeLocale()) || message.messagePerLocale()[activeLocale()]) || (messageMessageHTML('default') || message.messagePerLocale().default) || t('pu.po.tab2.default-message'); } }),
                                        // m('.preview-message-message', message.messagePerLocale()[activeLocale()] || message.messagePerLocale().default || t('pu.po.tab2.default-message')),
                                        message.buttons() > 0 ?
                                            m('.preview-buttons', [
                                                message.buttons() > 0 ? m('.preview-button', message.messagePerLocale()[activeLocale() + push.C.S + '0' + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 't']) : '',
                                                message.buttons() > 1 ? m('.preview-button', message.messagePerLocale()[activeLocale() + push.C.S + '1' + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 't']) : '',
                                            ])
                                            : '',
                                        popup.previewPlatform() === 'a' && message.media() && message.media.valid && (!message.media.platforms || message.media.platforms.indexOf(popup.previewPlatform()) !== -1) ?
                                            message.media.view()
                                            : '',
                                    ]),
                                ]),
                                message.platforms().length > 1 ? 
                                    C.segmented.view(ctrl.segmentedPlatform)
                                    : '',
                            ]) :
                            ''
                    ]),
                    m('.btns', {key: 'btns'}, [
                        !message.auto() && message.count() ? m('div', {
                            style: {
                                fontSize: "14px",
                                padding: "25px",
                                paddingLeft: "20px",
                                width: "200px",
                                float: "left"
                            }
                        }, [
                                t.n('pu.po.recipients', message.count()),
                                message.locales().length > 1 ?
                                    ''
                                    : m('span.warn', C.tooltip.config(t('pu.po.recipients.temporary')), push.ICON.WARN())
                            ])
                            : "",
                        m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(viewTabIndex) ? false : 'disabled' }, t('pu.po.next')),
                        popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                    ])
                ]);
            }
        });

        tabs.push({
            tab: this.renderTab.bind(this, tabs.length),
            controller: function () {
                this.viewContents = new C.push.view.contents.controller({message: message});
            },
            view: function (ctrl) {
                return m('.comp-push-tab-content.comp-summary', [
                    m('.comp-panel', [
                        m('.form-group', [
                            m('h4', t('pu.po.confirm')),
                            m('input[type=checkbox]', { checked: message.ack() ? 'checked' : undefined, onchange: function () { message.ack(!message.ack()); } }),
                            m('label', { onclick: function () { message.ack(!message.ack()); } }, t('pu.po.confirm.ready') + (message.auto() ? '' : ' ' + t.n('pu.po.confirm', message.count())) ),
                        ]),
                        C.push.view.contents.view(ctrl.viewContents),
                        m('.btns.final', {key: 'btns'},
                            m('div.final-footer', [
                                m('div', [
                                    message.auto() ? '' : message.count() ? m('div', { key: 'info-message' }, t.p('pu.po.recipients.message', message.count())) : '',
                                    message.auto() ? m('div', t('pu.po.recipients.message.details')) : '',
                                ]),
                                m('div', [
                                    m('a.btn-next', { href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled' }, message.auto() ? t('pu.po.start') : t('pu.po.send')),
                                    m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev'))
                                ])
                            ])
                            // message.auto() ? 

                            // message.count() ? m('div', {
                            //  style: {
                            //      fontSize: "14px",
                            //      padding: "25px",
                            //      paddingLeft: "20px",
                            //      width: "200px",
                            //      float: "left"
                            //  }
                            // }, [
                            //      t.n('pu.po.recipients', message.count()),
                            //      message.locales().length > 1 ?
                            //          ''
                            //          : m('span.warn', C.tooltip.config(t('pu.po.recipients.temporary')), push.ICON.WARN())
                            //  ])
                            //  : "",
                            // m('a.btn-next', { href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled' }, t('pu.po.send')),
                            // m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev'))
                        )
                    ])
                ]);
            }
        });


        this.tabs = new C.tabs.controller(tabs, { stepbystep: true, tabenabled: this.tabenabled, tabset: this.next });
        // this.tabs = new C.tabs.controller([

        //  {
        //      tab: this.renderTab.bind(this, 3),
        //      view: function () {
        //          return m('.comp-push-tab-content.comp-summary', [
        //              m('.comp-panel', { style: { width: "590px" } }, [
        //                  m('.form-group', { key: "tab_3_1" }, [
        //                      m('h4', t('pu.po.confirm')),
        //                      m('input[type=checkbox]', { checked: message.ack() ? 'checked' : undefined, onchange: function () { message.ack(!message.ack()); } }),
        //                      m('label', { onclick: function () { message.ack(!message.ack()); } }, t.n('pu.po.confirm', message.count())),
        //                  ]),
        //                  m('.form-group', { key: "tab_3_0" }, [
        //                      m('h4', t('pu.po.tab3.review')),
        //                      m('.sub-desc', t('pu.po.tab3.review-desc')),
        //                      m.component(C.push.view.contents, { message: message }),
        //                  ]),
        //                  m('.btns.final', [
        //                      message.count() ? m('div', {
        //                          style: {
        //                              fontSize: "14px",
        //                              padding: "25px",
        //                              paddingLeft: "20px",
        //                              width: "200px",
        //                              float: "left"
        //                          }
        //                      }, [
        //                              t.n('pu.po.recipients', message.count()),
        //                              message.locales().length > 1 ?
        //                                  ''
        //                                  : m('span.warn', C.tooltip.config(t('pu.po.recipients.temporary')), push.ICON.WARN())
        //                          ])
        //                          : "",
        //                      m('a.btn-next', { href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled' }, t('pu.po.send')),
        //                      m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev'))
        //                  ])
        //              ])
        //          ])
        //      }
        //  },
        // ], { stepbystep: true, tabenabled: this.tabenabled, tabset: this.next });

    };

    popup.view = function (ctrl) {
        return m('.comp-push', C.tabs.view(ctrl.tabs));
    };

});
