'use strict';

/* jshint undef: true, unused: true */
/* globals window, m, moment, vprop, countlyCommon, $ */

window.component('push.popup', function(popup) {
    var C = window.components,
        CC = window.countlyCommon,
        CG = window.countlyGlobal,
        t = C.t,
        push = C.push,
        emojiPersOpen = false,
        localesController;

    popup.show = function(prefilled, duplicate) {
        if (!push.dashboard) {
            return push.remoteDashboard(countlyCommon.ACTIVE_APP_ID).then(function() {
                popup.show(prefilled, duplicate);
            });
        }
        m.startComputation();
        var message = prefilled instanceof push.Message ? prefilled : new push.Message(prefilled || {});
        if (!duplicate) {
            if (!message.sound()) {
                message.sound('default');
            }
            if (!message.expiration()) {
                message.expiration(1000 * 3600 * 24 * 7);
            }
            if (message.auto() || message.tx()) {
                if (message._id()) {
                    message.editingAuto = true;
                }
                else if (!message.tx()) {
                    message.autoOnEntry(true);
                    message.autoCapMessages(2);
                    message.autoCapSleep(1000 * 3600 * 24);
                }
            }
        }

        if (message.platforms().length && message.apps().length) {
            var found = false;
            message.platforms().forEach(function (p) {
                message.apps().forEach(function (a) {
                    if (CC.dot(CG.apps[a], 'plugins.push.' + p + '._id') || 
                        (p === push.C.PLATFORMS.ANDROID && CC.dot(CG.apps[a], 'plugins.push.' + push.C.PLATFORMS.HUAWEI + '._id')) ||
                        (p === push.C.PLATFORMS.HUAWEI && CC.dot(CG.apps[a], 'plugins.push.' + push.C.PLATFORMS.ANDROID + '._id'))) {
                        found = true;
                    }
                });
            });

            if (!found) {
                m.endComputation();
                return window.CountlyHelpers.alert(t('push.error.no-credentials'), 'popStyleGreen', {title: t('push.error.no.credentials'), image: 'empty-icon', button_title: t('push.error.i.understand')});
            }
        }

        var aid = message.apps()[0];
        if (aid && !(CC.dot(CG.apps[aid], 'plugins.push.' + push.C.PLATFORMS.HUAWEI + '._id') ||
            CC.dot(CG.apps[aid], 'plugins.push.' + push.C.PLATFORMS.ANDROID + '._id') ||
            CC.dot(CG.apps[aid], 'plugins.push.' + push.C.PLATFORMS.IOS + '._id'))) {
            m.endComputation();
            return window.CountlyHelpers.alert(t('push.error.no-app-credentials'), 'popStyleGreen', {title: t('push.error.no.credentials'), image: 'empty-icon', button_title: t('push.error.i.understand')});
        }


        if (message.auto() && (!push.dashboard.cohorts || !push.dashboard.cohorts.length) && (!push.dashboard.events || !push.dashboard.events.length)) {
            m.endComputation();
            return window.CountlyHelpers.alert(t('push.error.no-cohorts'), 'popStyleGreen', {title: t('push.error.no.cohorts'), image: 'empty-icon', button_title: t('push.error.i.understand')});
        }

        push.popup.slider = C.slider.show({
            key: 'meow' + Math.random(),
            title: function () {
                var els = [
                    t('pu.po.title')
                ];
                return m('h3', els);
            },
            desc: message.auto() || message.tx() ? t('pu.po.desc').replace('4', '5') : t('pu.po.desc'),
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
            esc: function() {
                if (emojiPersOpen && localesController) {
                    var res = localesController.locales.map(function(l) {return l.titleCtrl.close(true) || l.messageCtrl.close(true)}).filter(function(b) {return !!b});
                    if (res.length) {
                        m.startComputation();
                        m.endComputation();
                        return false;
                    }
                }
                return true;
            }
        });
        m.endComputation();
    };

    popup.controller = function (message) {
        var popup = this, apps = [], onetimeCohorts = [], cohorts = [], events = [], geos = [];

        if (message.auto()) {
            cohorts = push.dashboard.cohorts.map(function (cohort) {
                return new C.selector.Option({ value: cohort._id, title: cohort.name, selected: message.autoCohorts().indexOf(cohort._id) !== -1 });
            }); 
            events = push.dashboard.events.map(function (event) {
                return new C.selector.Option({ value: event.key, title: event.name, selected: message.autoEvents().indexOf(event.name) !== -1 });
            });
        } else if (!message.tx()) {
            onetimeCohorts = push.dashboard.cohorts.map(function (cohort) {
                return new C.selector.Option({ value: cohort._id, title: cohort.name, selected: message.cohorts().indexOf(cohort._id) !== -1 });
            }); 
            geos = push.dashboard.geos.map(function (geo) {
                return new C.selector.Option({ value: geo._id, title: geo.title, selected: message.geos().indexOf(geo._id) !== -1 });
            });
        }

        // t.set('pu.po.tab1.title', t('pu.po.tab1.title' + !!window.countlyGeo));

        this.message = message;
        this.renderTab = function (i, active) {
            var tab;
            if (((message.auto() || message.tx()) && i <= 2) || (!message.auto() && !message.tx() && i <= 1)) {
                tab = 'tab' + i;
            } else {
                if (((message.auto() || message.tx()) && i === 3) || (!message.auto() && !message.tx() && i === 2)) {
                    tab = 'compose';
                } else if (((message.auto() || message.tx()) && i === 4) || (!message.auto() && !message.tx() && i === 3)) {
                    tab = 'review';
                }
            }

            return m('.comp-push-tab', { class: active && !popup.warnNoUsers() ? 'active' : '' }, [
                popup.warnNoUsers() ?
                    i < 2 ? push.ICON.WARN('comp-push-tab-warn') : m('.comp-push-tab-num', i + 1)
                    // i < 2 ? m('svg.comp-push-tab-warn[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')) : m('.comp-push-tab-num', i + 1)
                    : i < this.tabs.tab() ? m('.comp-push-tab-num.ion-checkmark') : m('.comp-push-tab-num', i + 1),
                m('.comp-push-tab-title', t('pu.po.' + tab + '.title' + (message.auto() || message.tx() ? '.auto' : ''), t('pu.po.' + tab + '.title'))),
                m('.comp-push-tab-desc', t('pu.po.' + tab + '.desc' + (message.auto() || message.tx() ? '.auto' : ''), t('pu.po.' + tab + '.desc')))
            ]);
        };

        for (var k in CG.apps) {
            var a = CG.apps[k];
            if (CC.dot(a, 'plugins.push.i._id') || CC.dot(a, 'plugins.push.a._id')) {
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
            if (((message.auto() || message.tx()) && tab >= 4) || (!message.auto() && !message.tx() && tab >= 3)) {
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
            if (enabled && (message.auto() || message.tx()) && tab >= 3) {
                if (message.autoDelay() === null ||
                    message.autoTime() === null ||
                    message.autoCapMessages() === null || 
                    message.autoCapSleep() === null) {
                    enabled = false;
                }
            }
            if (enabled && !message.auto() && !message.tx() && tab >= 2) {
                if (message.date() === null) {
                    enabled = enabled && !!message.date();
                }
            }
            if (enabled && (message.auto() || message.tx()) && tab >= 2) {
                if (message.tx()) {
                    enabled = true;
                } else if (message.autoOnEntry() === 'events'){
                    if (message.autoEvents().length === 0 ||
                        message.date() === null ||
                        message.autoEnd() === null) {
                        enabled = false;
                    }

                } else {
                    if (message.autoCohorts().length === 0 ||
                        message.date() === null ||
                        message.autoEnd() === null) {
                        enabled = false;
                    }
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
                if ((((message.auto() || message.tx()) && tab >= 3) || (!message.auto() && !message.tx() && tab >= 2)) && !message.count()) {
                    C.slider.instance.loading(true);
                    message.remotePrepare(this.checkForNoUsers.bind(this, true)).then(function () {
                        var done = function () {
                            m.startComputation();
                            C.slider.instance.loading(false);
                            this.checkForNoUsers();
                            if (message.count() && this.tabenabled(tab)) {
                                popup.tabs.set(tab);
                            }
                            m.endComputation();
                        }.bind(this);
                        setTimeout(function(){
                            if (message.auto() && message.autoOnEntry() === 'events') {
                                Promise.all(message.autoEvents().map(function(key) { return C.push.initEvent(key); })).then(done, done);
                            } else {
                                done();
                            }
                        }, 400);
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

        var sending = false;
        this.send = function (ev) {
            ev.preventDefault();
            if (!message.ack() && !message.editingAuto) { return; }
            if (sending) { return; }
            sending = true;
            C.slider.instance.loading(true);
            message.remoteCreate().then(function () {
                sending = false;
                message.saved(true);

                setTimeout(function () {
                    m.startComputation();
                    C.slider.instance.close();
                    if (window.app.activeView.mounted) {
                        window.app.activeView.mounted.refresh();
                    }
                    window.app.recordEvent({
                        "key": "push-create",
                        "count": 1,
                        "segmentation": {type: (message.auto() === true) ? "auto" : message.tx() === true ? 'tx' : "one-time" }
                    });
                    m.endComputation();
                }, 1000);
            }, function (error) {
                sending = false;
                C.slider.instance.loading(false);
                window.CountlyHelpers.alert(error.error || error.result || error, 'popStyleGreen', {title: t('pu.po.tab3.errors.message'), image: 'empty-icon', button_title: t('push.error.i.understand')});
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

        var activeLocale = m.prop('default'), htmlTitles = {}, htmlMessages = {},
            messageTitleHTML = function (locale) {
                if (arguments.length > 1) {
                    htmlTitles[locale] = arguments[1];
                }
                return htmlTitles[locale];
            },
            messageMessageHTML = function (locale) {
                if (arguments.length > 1) {
                    htmlMessages[locale] = arguments[1];
                }
                return htmlMessages[locale];
            };

        function buttonTitle(index, key, locale) {
            var k = (locale || activeLocale()) + (index === undefined ? (push.C.S + key) : (push.C.S + index + push.C.S + key));

            return vprop(message.messagePerLocale()[k] || (index === undefined ? undefined : key === 't' && (locale || activeLocale()) === 'default' ? t('pu.po.tab2.mbtn.' + (index + 1)) : undefined), function (v) {
                return !!v;
            }, t('pu.po.tab2.mbtn.req'), function (v) {
                k = (locale || activeLocale()) + (index === undefined ? (push.C.S + key) : (push.C.S + index + push.C.S + key));

                if (arguments.length) {
                    if (v && key === 'l') {
                        v = v.trim();
                    }
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
                        l.key = 'tab' + l.value;
                        l.messageTitle = buttonTitle(undefined, 't', l.value);
                        l.messageTitlePers = function(){
                            if (arguments.length) {
                                message.messagePerLocale()[l.value + push.C.S + 'tp'] = arguments[0];
                            }
                            return message.messagePerLocale()[l.value + push.C.S + 'tp'];
                        };
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
                        l.messageMessagePers = function(){
                            if (arguments.length) {
                                message.messagePerLocale()[l.value + push.C.S + 'p'] = arguments[0];
                            }
                            return message.messagePerLocale()[l.value + push.C.S + 'p'];
                        };
                        l.buttonTitle0 = buttonTitle(0, 't', l.value);
                        l.buttonTitle1 = buttonTitle(1, 't', l.value);
                        l.buttonUrl0 = buttonTitle(0, 'l', l.value);
                        l.buttonUrl1 = buttonTitle(1, 'l', l.value);

                        var persOpts = push.PERS_OPTS.slice();
                        if (message.auto() && message.autoOnEntry() === 'events') {
                            message.autoEvents().forEach(function(key) {
                                var data = push.PERS_EVENTS[key];
                                if (data && data.length) {
                                    persOpts = persOpts.concat([new C.selector.Option({title: key})]).concat(data);
                                }
                            });
                        }

                        l.titleCtrl = new C.emoji.controller({
                            key: 't' + l.value, 
                            value: l.messageTitle, 
                            valueHTML: messageTitleHTML.bind(null, l.value), 
                            valuePers: l.messageTitlePers, 
                            valueCompiled: message.titleCompile.bind(message, l.value, true), 
                            placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.mtitle.placeholder') : messageTitleHTML('default') || t('pu.po.tab2.mtitle.placeholder'); },
                            persOpts: persOpts && persOpts.length ? persOpts : undefined,
                            onToggle: function(v) { emojiPersOpen = v; }
                        });
                        l.messageCtrl = new C.emoji.controller({
                            key: 'm' + l.value, 
                            value: l.messageMessage, 
                            valueHTML: messageMessageHTML.bind(null, l.value), 
                            valuePers: l.messageMessagePers, 
                            valueCompiled: message.messageCompile.bind(message, l.value, true), 
                            textarea: true, 
                            placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.placeholder') : messageMessageHTML('default') || t('pu.po.tab2.placeholder'); },
                            persOpts: persOpts && persOpts.length ? persOpts : undefined,
                            onToggle: function(v) { emojiPersOpen = v; }
                        });

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
                this.comp = opts.comp;
                this.cls = opts.cls;
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

                return m('.comp-push-extra', { class: (!ctrl.textarea || ctrl.value() === undefined ? '' : 'expanded') + ' ' + (ctrl.cls || '') }, [
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
                    }, ctrl.comp ? ctrl.comp() : [
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

                    // this.selectGeos = new C.singleselect.controller({
                    //     options: [{ value: undefined, title: t('pu.po.tab1.geos.no') }].concat(push.dashboard.geos.map(function (geo) {
                    //         return { value: geo._id, title: geo.title };
                    //     })),
                    //     value: message.geo
                    // });

                    this.selectGeos = new C.multiselect.controller({
                        placeholder: t('pu.po.tab1.geos.no'),
                        options: geos,
                        value: function () {
                            if (arguments.length) {
                                message.geos(geos.filter(function (o) { return o.selected(); }).map(function(o){ return o.value(); }));
                            }
                            return geos;
                        }
                    });

                    this.selectOnetimeCohorts = new C.multiselect.controller({
                        placeholder: t('pu.po.tab1.geos.no'),
                        options: onetimeCohorts,
                        value: function () {
                            if (arguments.length) {
                                message.cohorts(onetimeCohorts.filter(function (o) { return o.selected(); }).map(function(o){ return o.value(); }));
                            }
                            return onetimeCohorts;
                        }
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
                            !message.auto() && !message.tx() && push.dashboard.geos && push.dashboard.geos.length ?
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.geos')),
                                    C.multiselect.view(ctrl.selectGeos),
                                    m('.desc', t('pu.po.tab1.geos-desc')),
                                ])
                                : '',
                            !message.auto() && !message.tx() && push.dashboard.cohorts && push.dashboard.cohorts.length ?
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.chr')),
                                    C.multiselect.view(ctrl.selectOnetimeCohorts),
                                    m('.desc', t('pu.po.tab1.chr-desc')),
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

        if (message.auto() || message.tx()) {
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
                            { value: false, title: t('pu.po.tab1.trigger-type.exit'), desc: t('pu.po.tab1.cohort-exit-desc') },
                            { value: 'events', title: t('pu.po.tab1.trigger-type.event'), desc: t('pu.po.tab1.cohort-event-desc') },
                        ], value: message.autoOnEntry, onchange: function(neo, old){
                            neo = typeof neo === 'boolean';
                            old = typeof old === 'boolean';
                            if (neo ^ old) {
                                message.autoEvents([]);
                                message.autoCohorts([]);
                                cohorts.forEach(function(c){ c.selected(false); });
                                events.forEach(function(c){ c.selected(false); });
                                this.selectCohorts.value([]);
                                this.selectEvents.value([]);
                            }
                        }.bind(this)
                    });
                    this.selectEvents = new C.multiselect.controller({
                        placeholder: t('pu.po.tab1.select-event-placeholder'),
                        options: events,
                        value: function () {
                            if (arguments.length) {
                                message.autoEvents(events.filter(function (o) { return o.selected(); }).map(function(o){ return o.value(); }));
                            }
                            return events;
                        }
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
                                        this.datepicker = C.datepicker.controller({ value: message.date, defaultDate: d, position: 'top', id: 'campaign-start-date' });
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
                        position: 'top',
                        id: 'campaign-end-date',
                        defaultDate: d, 
                        value: message.autoEnd,
                        onclick: function() { 
                            if (message.autoEnd() === undefined) {
                                message.autoEnd(null);
                            }
                        },
                    });

                    this.radioActualDates = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab2.ddc.arr') },
                            { value: true, title: t('pu.po.tab2.ddc.evt') }
                        ], value: message.actualDates
                    });

                    this.radioCancelTriggerEntry = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab2.trc.dont') },
                            { value: true, title: t('pu.po.tab2.trc.true') }
                        ], value: message.autoCancelTrigger
                    });

                    this.radioCancelTriggerExit = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab2.trc.dont') },
                            { value: true, title: t('pu.po.tab2.trc.false') }
                        ], value: message.autoCancelTrigger
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
                        m('.comp-panel', 
                            (message.tx() ? [] : [
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.trigger-type')),
                                    C.radio.view(ctrl.radioType)
                                ]),
                                message.autoOnEntry() === 'events' ?
                                    m('.form-group', [
                                        m('h4', t('pu.po.tab1.select-event')),
                                        C.multiselect.view(ctrl.selectEvents),
                                    ]) :
                                    m('.form-group', [
                                        m('h4', t('pu.po.tab1.select-cohort')),
                                        C.multiselect.view(ctrl.selectCohorts),
                                        m('.desc', t('pu.po.tab1.select-cohort-desc')),
                                    ]),
    
                                message.autoOnEntry() === 'events' ? m('.form-group', [
                                    m('h4', t('pu.po.tab2.ddc')),
                                    C.radio.view(ctrl.radioActualDates),
                                    // m('.desc', t('pu.po.tab2.ddc.h'))
                                ]) : '',
    
                                message.autoOnEntry() !== 'events' ? m('.form-group', [
                                    m('h4', t('pu.po.tab2.trc')),
                                    message.autoOnEntry() === true ? C.radio.view(ctrl.radioCancelTriggerEntry) : C.radio.view(ctrl.radioCancelTriggerExit),
                                    // m('.desc', t('pu.po.tab2.ddc.h'))
                                ]) : '',
                            ]).concat([
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
                            ])
                        ));
                }
            });

            // Message Delivery
            tabs.push({
                tab: this.renderTab.bind(this, 2),
                controller: function () {
                    this.delay = new C.delay.controller({days: true, hours: true, value: message.autoDelay});
                    this.sleep = new C.delay.controller({days: true, hours: true, value: message.autoCapSleep});
                    this.expiration = new C.delay.controller({days: true, hours: true, value: message.expiration});
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
                            { value: undefined, title: t('pu.po.tab2.immediately'), desc: t('pu.po.tab2.immediately-desc' + (message.autoOnEntry() === 'events' ? '-event' : '')) },
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
                                title: (hour < 10 ? '0' + hour : hour) + ':00'
                            });
                        })
                    });

                    this.radioCap = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.po.tab2.capping.no'),  desc: t('pu.po.tab2.capping.no-desc' + (message.autoOnEntry() === 'events' ? '-event' : message.tx() ? '-tx' : ''))  },
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
                        m('.comp-panel', 
                            (message.tx() ? [] : [
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
                                ])
                            ]).concat([
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
                                                    type: 'number', 
                                                    value: message.autoCapMessages(),
                                                    min: 0,
                                                    oninput: function(){
                                                        if (!('' + this.value).length) {
                                                            message.autoCapMessages(undefined);
                                                        } else if (('' + this.value).length && !isNaN(parseInt(this.value)) && parseInt(this.value) >= 0) {
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
    
                                m('.form-group', [
                                    m('.comp-grid', [
                                        m('.comp-grid-row', [
                                            m('.comp-grid-cell', t('pu.po.tab2.expiry')),
                                            m('.comp-grid-cell', C.delay.view(ctrl.expiration))
                                        ])
                                    ]),
                                    m('.desc', t('pu.po.tab2.expiry-desc'))
                                ]),
    
                                m('.btns', {key: 'btns'}, [
                                    m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(3) ? false : 'disabled' }, t('pu.po.next')),
                                    popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                                ])
                            ])
                        )
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

                    this.expiration = new C.delay.controller({days: true, hours: true, value: message.expiration});

                    this.radioTz = new C.radio.controller({
                        options: [
                            { value: false, title: t('pu.no'), desc: t('pu.po.tab1.tz-no-desc') },
                            { value: new Date().getTimezoneOffset(), title: t('pu.po.tab1.tz-yes'), desc: t('pu.po.tab1.tz-yes-desc') }
                        ], value: message.tz
                    });

                    this.radioBuildLater = new C.radio.controller({
                        options: [
                            { value: true, title: t('pu.po.tab1.later.t'), desc: t('pu.po.tab1.later.d') },
                            { value: false, title: t('pu.po.tab1.now.t'), desc: t('pu.po.tab1.now.d') }
                        ], value: message.delayed
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
                                    m('h4', t('pu.po.tab1.aud')),
                                    C.radio.view(ctrl.radioBuildLater),
                                ]) : '',
                            message.date() ?
                                m('.form-group', [
                                    m('h4', t('pu.po.tab1.tz')),
                                    m('.desc', [
                                        t('pu.po.tab1.tz-desc'),
                                        ' ',
                                        m('span.warn', C.tooltip.config(t('pu.po.tab1.tz-yes-help')), push.ICON.WARN())
                                    ]),
                                    C.radio.view(ctrl.radioTz)
                                ]) : '',

                            m('.form-group', [
                                m('.comp-grid', [
                                    m('.comp-grid-row', [
                                        m('.comp-grid-cell', t('pu.po.tab2.expiry')),
                                        m('.comp-grid-cell', C.delay.view(ctrl.expiration))
                                    ])
                                ]),
                                m('.desc', t('pu.po.tab2.expiry-desc'))
                            ]),

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

                C.push.initPersOpts();
                var persOpts = push.PERS_OPTS;
                persOpts.forEach(function(op){
                    op.selected(message.userProps() && message.userProps().indexOf(op.value()) !== -1);
                });
                if (message.auto() && message.autoOnEntry() === 'events') {
                    message.autoEvents().forEach(function(key) {
                        var data = push.PERS_EVENTS[key];
                        if (data && data.length) {
                            persOpts = persOpts.concat([new C.selector.Option({title: key})]).concat(data);
                        }
                    });
                }
                this.userProps = new C.multiselect.controller({
                    placeholder: t('pu.po.tab2.extras.props.placeholder'),
                    options: persOpts,
                    value: function () {
                        if (arguments.length) {
                            message.userProps(persOpts.filter(function (o) { return o.selected(); }).map(function(o){ return o.value(); }));
                        }
                        return persOpts;
                    }
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
                                m(extra, {cls: 'nopad', title: t('pu.po.tab2.extras.props'), help: t('pu.po.tab2.extras.props.help'), value: message.userProps, comp: function(){
                                    return message.userProps() === undefined ? '' : C.multiselect.view(ctrl.userProps);
                                }}),
                            ]),
                        ]),
                        message.type() === push.C.TYPE.MESSAGE ?
                            m('.comp-push-panel.comp-push-panel-compose-right.comp-push-preview', [
                                m('h4', [t('pu.po.preview'), m('i.ion-information-circled', C.tooltip.config(t('pu.po.preview.help')))]),
                                m('.preview.preview-' + popup.previewPlatform(), [
                                    m('img', { src: '/images/push/preview.' + popup.previewPlatform() + '.png' }),
                                    // m('.preview-time', d.format('H:mm')),
                                    // m('.preview-date', d.format("dddd, MMMM DD")),
                                    m('.preview-message', [
                                        m('img', { src: 'appimages/' + message.apps()[0] + '.png' }),
                                        m('.preview-message-title', [
                                            m('span.preview-message-app', CG.apps[message.apps()[0]].name),
                                            m('span.preview-message-date', popup.previewPlatform() === push.C.PLATFORMS.IOS ? 'X' : d.format('LT')),
                                        ]),
                                        popup.previewPlatform() === 'i' && message.media() && message.media.valid ?
                                            message.media.view()
                                            : '',
                                        message.messagePerLocale()[activeLocale() + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + 'tp'] ?
                                            m('.preview-message-message-title', { config: function (el) { 
                                                el.innerHTML = (messageTitleHTML(activeLocale()) || message.titleCompile(activeLocale(), true)) || (messageTitleHTML('default') || message.titleCompile('default', true)); 
                                                // el.innerHTML = message.titleCompile(activeLocale(), true);
                                                el.querySelectorAll('.pers').forEach(function(el){
                                                    el.textContent = el.getAttribute('data-fallback');

                                                    var key = el.getAttribute('data-key'),
                                                    name = push.PERS_OPTS && push.PERS_OPTS.filter(function(opt){ return opt.value() === key; })[0];
                                                    if (name) {
                                                        name =  t.p('pu.po.tab2.tt', name.title(), el.getAttribute('data-fallback'));
                                                    } else if (message.auto() && message.autoOnEntry() === 'events') {
                                                        name = message.autoEvents().map(function(event){
                                                            return push.PERS_EVENTS && push.PERS_EVENTS[event] && push.PERS_EVENTS[event].filter(function(opt){ return opt.value() === key; })[0];
                                                        }).filter(function(opt) { return !!opt; })[0];
                                                        if (name) {
                                                            name = name.desc() || t.p('pu.po.tab2.tt', name.title(), el.getAttribute('data-fallback'));
                                                        }
                                                    }
                                                    if (!name) {
                                                        name = t.p('pu.po.tab2.tt', el.getAttribute('data-key'), el.getAttribute('data-fallback'));
                                                    }
                                                    el.title = name;
                                                    $(el).tooltipster({
                                                        animation: 'fade',
                                                        animationDuration: 100,
                                                        delay: 100,
                                                        maxWidth: 240,
                                                        theme: 'tooltipster-borderless',
                                                        trigger: 'custom',
                                                        triggerOpen: {
                                                            mouseenter: true,
                                                            touchstart: true
                                                        },
                                                        triggerClose: {
                                                            mouseleave: true,
                                                            touchleave: true
                                                        },
                                                        interactive: true,
                                                        contentAsHTML: true
                                                    });
                                                });
                                            } })
                                            // m('.preview-message-message-title', message.messagePerLocale()[activeLocale() + push.C.S + 't'] || message.messagePerLocale()['default' + push.C.S + 't'])
                                            : '',
                                        m('.preview-message-message', { config: function (el) { 
                                            // el.innerHTML = (messageMessageHTML(activeLocale()) || message.messagePerLocale()[activeLocale()]) || (messageMessageHTML('default') || message.messagePerLocale().default) || t('pu.po.tab2.default-message'); 
                                            el.innerHTML = (messageMessageHTML(activeLocale()) || message.messageCompile(activeLocale(), true)) || (messageMessageHTML('default') || message.messageCompile('default', true)) || t('pu.po.tab2.default-message'); 
                                            // el.innerHTML = message.messageCompile(activeLocale(), true) || '<div class="placeholder">' + t('pu.po.tab2.placeholder') + '</div>';
                                            el.querySelectorAll('.pers').forEach(function(el){
                                                el.textContent = el.getAttribute('data-fallback');

                                                var name = push.PERS_OPTS && push.PERS_OPTS.filter(function(opt){ return opt.value() === el.getAttribute('data-key'); })[0];
                                                if (name) {
                                                    name = name.title();
                                                }
                                                if (!name) {
                                                    name = el.getAttribute('data-key');
                                                }
                                                el.title = t.p('pu.po.tab2.tt', name, el.getAttribute('data-fallback'));
                                                $(el).tooltipster({
                                                    animation: 'fade',
                                                    animationDuration: 100,
                                                    delay: 100,
                                                    maxWidth: 240,
                                                    theme: 'tooltipster-borderless',
                                                    trigger: 'custom',
                                                    triggerOpen: {
                                                        mouseenter: true,
                                                        touchstart: true
                                                    },
                                                    triggerClose: {
                                                        mouseleave: true,
                                                        touchleave: true
                                                    },
                                                    interactive: true,
                                                    contentAsHTML: true
                                                });
                                            });
                                        } }),
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
                        !message.auto() && !message.tx() && !(message.delayed() && message.date()) && message.count() ? m('div', {
                            style: {
                                fontSize: '14px',
                                padding: '25px',
                                paddingLeft: '20px',
                                width: '200px',
                                float: 'left'
                            }
                        }, [
                            t.n('pu.po.recipients', message.count()),
                            message.locales().length > 1 ?
                                ''
                                : m('span.warn', C.tooltip.config(t('pu.po.recipients.temporary')), push.ICON.WARN())
                        ])
                            : '',
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
                        message.editingAuto ? '' : m('.form-group', [
                            m('h4', t('pu.po.confirm')),
                            m('input[type=checkbox]', { checked: message.ack() ? 'checked' : undefined, onchange: function () { message.ack(!message.ack()); } }),
                            m('label', { onclick: function () { message.ack(!message.ack()); } }, t('pu.po.confirm.ready') + (message.auto() || message.tx() || (message.delayed() && message.date()) ? '' : ' ' + t.n('pu.po.confirm', message.count())) ),
                        ]),
                        C.push.view.contents.view(ctrl.viewContents),
                        m('.btns.final', {key: 'btns'},
                            m('div.final-footer', [
                                m('div', [
                                    message.auto() || message.tx() || (message.delayed() && message.date()) ? '' : message.count() ? m('div', { key: 'info-message' }, t.p('pu.po.recipients.message', message.count())) : '',
                                    message.auto() ? m('div', message.editingAuto ? t('pu.po.recipients.message.edit') : t('pu.po.recipients.message.details')) : '',
                                ]),
                                m('div', [
                                    m('a.btn-next', { href: '#', onclick: popup.send, disabled: message.editingAuto || message.ack() ? false : 'disabled' }, message.auto() ? message.editingAuto ? t('pu.po.edit') : t('pu.po.start') : t('pu.po.send')),
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
