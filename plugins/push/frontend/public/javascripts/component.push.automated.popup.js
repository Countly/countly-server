'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment, vprop, countlyCommon, countlyGlobal, $ */

window.component('push.automated.popup', function (popup) {
    var t = window.components.t, push = window.components.push;

    popup.show = function (prefilled, duplicate) {
        if (!push.dashboard) {
            return push.remoteDashboard(countlyCommon.ACTIVE_APP_ID).then(function () {
                popup.show(prefilled);
            });
        }
        m.startComputation();
        var message = new push.Message(prefilled || {});
        if (!duplicate) {
            message.sound('default');
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
                return window.CountlyHelpers.alert(t('push.error.no-credentials'), 'red');
            }
        }

        message.getCohorts(function (cohorts) {
            push.popup.slider = window.components.slider.show({
                key: 'autopush-slider',
                title: function () {
                    var els = [
                        t('pu.po.title')
                    ];
                    return m('h3', els);
                },
                component: window.components.push.automated.popup,
                componentOpts: {
                    message: message,
                    cohorts: cohorts.map(function (cohort) {
                        return window.components.selector.Option({ value: cohort._id, title: cohort.name, selected: false });
                    })
                },
                loadingTitle: function () {
                    return message.count() ? message.saved() ? t('pu.po.sent') : t('pu.po.sending') : t('pu.po.loading');
                },
                loadingDesc: function () {
                    return message.count() ? message.saved() ? t('pu.po.sent-desc') : t('pu.po.sending-desc') : t('pu.po.loading-desc');
                },
            });
            m.endComputation();
        });
    };

    popup.controller = function (opts) {
        var popup = this, apps = [];
        var message = opts.message;
        var cohorts = opts.cohorts || [];

        // t.set('pu.po.tab1.title', t('pu.po.tab1.title' + !!window.countlyGeo));

        this.message = message;
        this.renderTab = function (i, active) {
            return m('.comp-push-tab', { class: active ? 'active' : '' }, [
                m('.comp-push-tab-num', i + 1),
                m('.comp-push-tab-title', t('pu.po.auto.tab' + i + '.title')),
                m('.comp-push-tab-desc', t('pu.po.auto.tab' + i + '.desc'))
            ]);
        };


        for (var k in window.countlyGlobal.apps) {
            var a = window.countlyGlobal.apps[k];
            if ((a.apn && a.apn.length) || (a.gcm && a.gcm.length)) {
                apps.push(window.components.selector.Option({ value: a._id, title: a.name, selected: message.apps().indexOf(a._id) !== -1 }));
            }
        }

        this.previewPlatform = m.prop(message.platforms() && message.platforms().length ? message.platforms()[0] : push.C.PLATFORMS.IOS);
        this.warnNoUsers = m.prop(false);

        this.tabenabled = function (tab) {
            if (this.tabs.tab() >= tab) {
                return true;
            }

            var enabled = true;
            switch (tab) {
                /* falls through */
                case 4:
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
                    break;
                case 3:
                    if (message.autoDelay() === null || message.autoDelay() <= 0) {
                        enabled = false;
                    }

                    if (message.autoTime() === null) {
                        enabled = false;
                    }

                    if (message.autoCap() && (!message.autoCapMessages() || !message.autoCapSleep())) {
                        enabled = false;
                    }

                    break;
                case 2:
                    if (message.autoCohorts().length === 0) {
                        enabled = false;
                    }
                    if (message.schedule() && message.date() === null) {
                        enabled = false;
                    }
                    if (message.autoEnd() === null) {
                        enabled = false;
                    }
                    break;
                case 1:
                    enabled = enabled && message.platforms().length && message.apps().length;
                    break;
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
                if (tab >= 2) {
                    if (!message.schedule() && (message.date() !== undefined || message.tz() !== false)) {
                        message.date(undefined);
                        message.tz(false);
                    }
                }
                if (tab >= 3 && !message.count()) {
                    window.components.slider.instance.loading(true);
                    message.remotePrepare(this.checkForNoUsers.bind(this, true)).then(function () {
                        setTimeout(function () {
                            m.startComputation();
                            window.components.slider.instance.loading(false);
                            this.checkForNoUsers();
                            if (message.count() && this.tabenabled(tab)) {
                                popup.tabs.set(tab);
                            }
                            m.endComputation();
                        }.bind(this), 400);
                    }.bind(this), window.components.slider.instance.loading.bind(window.components.slider.instance, false));
                } else {
                    this.tabs.customComponent = null;
                    this.warnNoUsers(false);
                    popup.tabs.set(tab);
                }

                window.components.slider.instance.onresize();
            }
        }.bind(this);

        this.prev = function (ev) {
            ev.preventDefault();
            if (this.tabs.tab() > 0) {
                this.tabs.set(popup.tabs.tab() - 1);
                window.components.slider.instance.onresize();
            }
        }.bind(this);

        this.send = function (ev) {
            ev.preventDefault();
            //TODO: ADD SEND METHOD
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

                        l.titleCtrl = new window.components.emoji.controller({ key: 't' + l.value, value: l.messageTitle, valueHTML: messageTitleHTML.bind(null, l.value), placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.mtitle.placeholder') : messageTitleHTML('default') || t('pu.po.tab2.mtitle.placeholder'); } });
                        l.messageCtrl = new window.components.emoji.controller({ key: 'm' + l.value, value: l.messageMessage, valueHTML: messageMessageHTML.bind(null, l.value), textarea: true, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.placeholder') : messageMessageHTML('default') || t('pu.po.tab2.placeholder'); } });

                        l.btn0t = new window.components.input.controller({ value: l.buttonTitle0, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.btntext') : message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 't']; } });
                        l.btn1t = new window.components.input.controller({ value: l.buttonTitle1, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.btntext') : message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 't']; } });

                        l.btn0l = new window.components.input.controller({ value: l.buttonUrl0, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.urlordeep') : message.messagePerLocale()['default' + push.C.S + '0' + push.C.S + 'l']; } });
                        l.btn1l = new window.components.input.controller({ value: l.buttonUrl1, placeholder: function () { return l.value === 'default' ? t('pu.po.tab2.urlordeep') : message.messagePerLocale()['default' + push.C.S + '1' + push.C.S + 'l']; } });

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
                                var config = window.components.tooltip.config(t(error));
                                config.key = error;
                                config.appendToBody = true;
                                checkmark = !error ? m('span.ion-checkmark') : m('.error', {
                                    key: error,
                                    title: t(error),
                                    config: function (el) {
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
                                    }
                                }, push.ICON.WARN());
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
                                        m('.help-tt', m('span.ion-information-circled',
                                            {
                                                title: t('pu.po.tab2.default-message.help'),
                                                config: function (el) {
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
                                                }
                                            }))
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
                                    window.components.emoji.view(l.titleCtrl)
                                ]),
                                m('.emoji', [
                                    m('h6', t('pu.po.tab2.mtext')),
                                    window.components.emoji.view(l.messageCtrl)
                                ]),
                                message.buttons() > 0 ?
                                    m('div', [
                                        m('h6', t('pu.po.tab2.mbtn')),
                                        message.buttons() > 0 ?
                                            m('.custom-button', [
                                                m('h6', '#1'),
                                                m('div', [
                                                    window.components.input.view(l.btn0t),
                                                    l.buttonTitle0() && !l.buttonTitle0.valid ?
                                                        m('.error', window.components.tooltip.config(t('pu.po.tab2.mbtn.req')), push.ICON.WARN())
                                                        : '',
                                                ]),
                                                m('div', [
                                                    window.components.input.view(l.btn0l),
                                                    l.buttonUrl0() && !l.buttonUrl0.valid ?
                                                        m('.error', window.components.tooltip.config(t('pu.po.tab2.mbtn.url')), push.ICON.WARN())
                                                        : ''
                                                ])
                                            ])
                                            : '',
                                        message.buttons() > 1 ?
                                            m('.custom-button', [
                                                m('h6', '#2'),
                                                m('div', [
                                                    window.components.input.view(l.btn1t),
                                                    l.buttonTitle1() && !l.buttonTitle1.valid ?
                                                        m('.error', window.components.tooltip.config(t('pu.po.tab2.mbtn.req')), push.ICON.WARN())
                                                        : '',
                                                ]),
                                                m('div', [
                                                    window.components.input.view(l.btn1l),
                                                    l.buttonUrl1() && !l.buttonUrl1.valid ?
                                                        m('.error', window.components.tooltip.config(t('pu.po.tab2.mbtn.url')), push.ICON.WARN())
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
                    this.tabs = new window.components.tabs.controller(this.locales, { ontab: this.ontab });
                };
                this.relocale();
                this.ontab(0);
            },
            view: function (ctrl) {
                return m('.comp-push-locales', { class: 'buttons-' + message.buttons() }, [
                    window.components.tabs.view(ctrl.tabs),
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
                                    m('.error', {
                                        title: ctrl.title.errorText,
                                        config: function (el) {
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
                                        }
                                    }, push.ICON.WARN())
                                    : ''
                            ]
                        ),
                        ctrl.help ? m('.help-tt', {
                            title: ctrl.help,
                            config: function (el) {
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
                            }
                        }, m('span.ion-information-circled')) : ''
                    ]),
                    m('.comp-push-extra-value', {
                        class: ctrl.value() === undefined ? '' : 'active', onclick: function () {
                            if (ctrl.value() === undefined) { ctrl.oncheck(); }
                        }
                    }, [
                            m(ctrl.textarea ? 'textarea' : 'input[type=' + ctrl.typ + ']', inp),
                            ctrl.value() !== undefined && !ctrl.value.valid ?
                                m('.error', {
                                    title: ctrl.value.errorText,
                                    config: function (el) {
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
                                    }
                                }, push.ICON.WARN())
                                : ''
                        ])
                ]);
            }
        };

        this.tabs = new window.components.tabs.controller([
            // Apps & Platforms
            {
                tab: this.renderTab.bind(this, 0),
                controller: function () {
                    return {
                        appSelector: {
                            options: apps,
                            id: 'app-selector',
                            value: function () {
                                if (arguments.length) {
                                    message.apps([arguments[0]]);
                                    message.appNames(countlyGlobal.apps[arguments[0]].name);
                                    message.platforms(message.availablePlatforms());
                                    message.getCohorts(function (data) {
                                        cohorts = data.map(function (cohort) {
                                            return window.components.selector.Option({ value: cohort._id, title: cohort.name, selected: false });
                                        });
                                    });
                                }

                                return message.apps()[0];
                            }
                        },
                        onplatform: function (p, ev) {
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
                        },
                    };
                },

                view: function (ctrl) {
                    var platforms = message.availablePlatforms();
                    return m('div.comp-push-tab-content',
                        m('div.comp-panel', [
                            m('div.form-group', { key: "tab_0_0" }, { style: { marginBottom: "40px" } }, [
                                m('label.block-label', t('pu.po.tab0.select-apps')),
                                m.component(window.components.singleselect, ctrl.appSelector),
                                m('div.sub-desc', t('pu.po.tab0.select-apps-desc'))
                            ]),
                            m('div.form-group', { key: "tab_0_1" }, { style: { marginBottom: "40px" } }, [
                                m('label.block-label', t('pu.po.tab0.select-platforms')),
                                m('div', [
                                    platforms.map(function (p) {

                                        var o = { value: p, onchange: ctrl.onplatform.bind(ctrl, p) };
                                        if (message.platforms().indexOf(p) !== -1) {
                                            o.checked = 'checked';
                                        }
                                        return m('.check-box', { onclick: ctrl.onplatform.bind(ctrl, p) }, [
                                            m('input[type="checkbox"]', o),
                                            m('label', t('pu.platform.' + p))
                                        ]);
                                    })
                                ])
                            ]),
                            m('div.form-group', { key: "tab_0_2" }, [
                                m('label.block-label', t('pu.po.tab1.testing-desc')),
                                m.component(window.components.radio, {
                                    options: [
                                        { value: false, title: t('pu.po.tab1.testing-prod'), desc: t('pu.po.auto.tab0.testing-prod-desc') },
                                        { value: true, title: t('pu.po.tab1.testing-test'), desc: t('pu.po.auto.tab0.testing-test-desc') }
                                    ], value: message.test
                                })
                            ]),
                            m('.btns', [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(1) ? false : 'disabled' }, t('pu.po.next')),
                                m('a.btn-prev', { href: '#', onclick: function (ev) { window.components.slider.instance.close(ev); } }, t('pu.po.close'))
                            ])
                        ]));
                }
            },

            // Campaign Rules
            {
                tab: this.renderTab.bind(this, 1),
                view: function () {
                    return m('div.comp-push-tab-content',
                        m('div.comp-panel', [
                            m('div.form-group', { key: "tab_1_0" }, [
                                m('label.block-label', t('pu.po.auto.tab1.trigger-type')),
                                m.component(window.components.radio, {
                                    options: [
                                        { value: push.C.TRIGGER_TYPE.COHORT_ENTRY, title: t('Cohort entry'), desc: t('pu.po.auto.tab1.cohort-entry-desc') },
                                        { value: push.C.TRIGGER_TYPE.COHORT_EXIT, title: t('Cohort exit'), desc: t('pu.po.auto.tab1.cohort-exit-desc') }
                                    ], value: message.autoTriggerType
                                })
                            ]),
                            m('div.form-group', { key: "tab_1_1" }, [
                                m('label.block-label', t('pu.po.auto.tab1.select-cohort')),
                                m(window.components.multiselect, {
                                    placeholder: t('pu.po.auto.tab1.select-cohort-placeholder'),
                                    options: cohorts,
                                    value: function () {
                                        if (arguments.length) {
                                            var selectedCohorts = cohorts.filter(function (o) { return o.selected(); });
                                            message.autoCohorts(selectedCohorts);
                                        }
                                        return cohorts;
                                    }
                                }),
                                m('div.sub-desc', t('pu.po.auto.tab1.select-cohort-desc')),
                            ]),
                            m('div.form-group', { key: "tab_1_2" }, [
                                m('label.block-label', t('pu.po.auto.tab1.campaign-start-date')),
                                m.component(window.components.radio, {
                                    options: [
                                        {
                                            value: true, title: t('pu.po.tab1.scheduling-date'), view: function () {
                                                if (!this.datepicker) {
                                                    var d = new Date();
                                                    d.setHours(d.getHours() + 1);
                                                    d.setMinutes(0);
                                                    d.setSeconds(0);
                                                    d.setMilliseconds(0);
                                                    this.datepicker = window.components.datepicker.controller({ date: message.date, defaultDate: d, position: "top", id: 'campaign-start-date' });
                                                }
                                                return m('div.date-container', window.components.datepicker.view(this.datepicker));
                                            }.bind(this)
                                        },
                                        { value: false, title: t('pu.po.tab1.scheduling-now') },

                                    ], value: function () {
                                        if (arguments.length) {
                                            message.schedule.apply(null, arguments);
                                            if (message.schedule()) {
                                                if (!message.date()) {
                                                    message.date(this.datepicker.opts.defaultDate);
                                                }
                                            } else {
                                                message.date(null);
                                                this.datepicker.open(false);
                                            }
                                        } else {
                                            return message.schedule();
                                        }
                                    }.bind(this)
                                })
                            ]),
                            m('div.form-group', { key: "tab_1_3" }, [
                                m('label.block-label', t('pu.po.auto.tab1.additional-options')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', [
                                            m('div.check-box', { style: { display: "flex" } }, [
                                                m('input[type=checkbox]', {
                                                    id: "end-date",
                                                    checked: message.autoEnd() === undefined ? undefined : 'checked',
                                                    onchange: function () {
                                                        if (!this.checked && message.autoEnd() === undefined) {
                                                            message.autoEnd(null);
                                                        } else if (this.checked) {
                                                            message.autoEnd(undefined);
                                                        }
                                                    }
                                                }),
                                                m('label', { "for": "end-date", style: { marginBottom: "0px", marginTop: "0px" }, onclick: function(ev) {
                                                    if (message.autoEnd() === undefined) {
                                                        message.autoEnd(null);
                                                    }
                                                } }, t('pu.po.auto.tab1.campaign-end-date'))
                                            ]),
                                        ]),

                                        m('div.comp-grid-cell', { 
                                                style: { backgroundColor: message.autoEnd() === undefined ? "#F3F4F5" : "transparent"},
                                                onclick: function(ev) {
                                                    if (message.autoEnd() === undefined) {
                                                        message.autoEnd(null);
                                                    }
                                                }
                                            },
                                            m.component(window.components.datepicker, {
                                                position: "top",
                                                id: 'campaign-end-date',
                                                defaultDate: new Date(), 
                                                date: message.autoEnd
                                            })
                                        )
                                    ])
                                ])
                            ]),
                            m('.btns', [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(2) ? false : 'disabled' }, t('pu.po.next')),
                                popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                            ])
                        ]));
                }
            },

            // Message Delivery
            {
                tab: this.renderTab.bind(this, 2),
                controller: function () {
                    this.times = [];
                    for (var i = 1; i <= 24; i++) this.times.push(i);
                },
                view: function (ctrl) {
                    return m('div.comp-push-tab-content',
                        m('div.comp-panel', [
                            m('div.form-group', { key: "tab_2_0" }, [
                                m('label.block-label', t('pu.po.auto.tab2.delivery-method')),
                                m('div.sub-desc', { style: { paddingTop: "0px" } }, t('pu.po.auto.tab2.delivery-method-desc')),
                                m.component(window.components.radio, {
                                    options: [
                                        { value: null, title: t('pu.po.auto.tab2.immediately'), desc: t('pu.po.auto.tab2.immediately-desc') },
                                        {
                                            value: 1, title: t('pu.po.auto.tab2.delayed'), view: function () {

                                                return m('div.comp-delay-container', [
                                                    m('input', {
                                                        type: "number",
                                                        min: 1,
                                                        value: message.autoDelay() === null ? '' : message.autoDelay(),
                                                        oninput: function (e) {
                                                            var i = parseInt(this.value);
                                                            if (!isNaN(i) && i >= 0) {
                                                                message.autoDelay(i);
                                                            } else {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }
                                                        },
                                                        style: { backgroundColor: "transparent" }
                                                    }),
                                                    m('span', t('pu.po.auto.tab2.days'))
                                                ]);

                                            }
                                        }
                                    ], value: function() {
                                        if (arguments[0] === null && message.autoDelay() > 0) {
                                            message.autoDelay(null);
                                        } else if (arguments[0] === 1 && message.autoDelay() === null) {
                                            message.autoDelay(1);
                                        }
                                        return message.autoDelay() === null ? null : 1;
                                    }
                                })
                            ]),

                            m('div.form-group', { key: "tab_2_1" }, [
                                m('label.block-label', t('pu.po.auto.tab2.delivery-time')),
                                m('div.sub-desc-below', t('pu.po.auto.tab2.delivery-time-desc')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', [
                                            m('div.check-box', { style: { display: "flex" } }, [
                                                m('input[type=checkbox]', {
                                                    id: "send-time",
                                                    checked: message.autoTime() === undefined ? undefined : 'checked',
                                                    onchange: function () {
                                                        if (!this.checked && message.autoTime() === undefined) {
                                                            message.autoTime(null);
                                                        } else if (this.checked) {
                                                            message.autoTime(undefined);
                                                        }
                                                    }
                                                }),
                                                m('label', { "for": "send-time", style: { 
                                                    marginBottom: "0px", 
                                                    marginTop: "0px",
                                                    onclick: function(ev) {
                                                        if (message.autoTime() === undefined) {
                                                            message.autoTime(null);
                                                        }
                                                    }
                                                } }, t('pu.po.auto.tab2.send-in-user-tz'))
                                            ]),
                                        ]),

                                        m('div.comp-grid-cell.time-select', {
                                            style: { backgroundColor: message.autoTime() === undefined ? "#F3F4F5" : "transparent" },
                                            onclick: function(ev) {
                                                if (message.autoTime() === undefined) {
                                                    message.autoTime(null);
                                                }
                                            }
                                        }, [
                                            m('i.material-icons', 'query_builder'),
                                            message.autoTime() === undefined ? '' : m.component(window.components.singleselect, {
                                                id: 'delivery-time',
                                                value: message.autoTime,
                                                options: ctrl.times.map(function (time) {
                                                    return window.components.selector.Option({
                                                        value: (time < 10 ? "0" + time : time) + ":00",
                                                        title: (time < 10 ? "0" + time : time) + ":00"
                                                    });
                                                })
                                            })
                                        ])
                                    ])
                                ])
                            ]),

                            m('div.form-group', { key: "tab_2_1" }, [
                                m('label.block-label', t('pu.po.auto.tab2.delivery-time')),
                                m('div.sub-desc', { style: { paddingTop: "0px" } },t('pu.po.auto.tab2.delivery-time-desc')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab2.send-in-user-tz')),
                                        m('div.comp-grid-cell.time-select', [
                                            m('i.material-icons', 'query_builder'),
                                            m.component(window.components.singleselect, {
                                                id: 'delivery-time',
                                                value: message.autoTime,
                                                options: ctrl.times.map(function (time) {
                                                    return window.components.selector.Option({
                                                        value: (time < 10 ? "0" + time : time) + ":00",
                                                        title: (time < 10 ? "0" + time : time) + ":00"
                                                    });
                                                })
                                            })
                                        ])
                                    ])
                                ]),
                            ]),
                            m('div.form-group', { key: "tab_2_2" }, [
                                m('label.block-label', t('pu.po.auto.tab2.capping')),
                                m('div.sub-desc', { style: { paddingTop: "0px" } }, t('pu.po.auto.tab2.capping-desc')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab2.message-per-user')),
                                        m('div.comp-grid-cell', { style: { padding: "0px" } }, [
                                            m('input', {
                                                type: "number", value: message.autoCapMessages(),
                                                min: 1,
                                                oninput: function (e) {
                                                    message.autoCapMessages(e.target.value);
                                                }
                                            })
                                        ])
                                    ])
                                ])
                            ]),
                            m('.btns', [
                                m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(3) ? false : 'disabled' }, t('pu.po.next')),
                                popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                            ])
                        ])
                    );
                }
            },
            // Compose Message
            {
                tab: this.renderTab.bind(this, 3),
                controller: function () {
                    localesController = new locales.controller();
                },
                view: function () {
                    var d = moment();
                    return m('.comp-push-tab-content', [
                        m('.comp-push-panels', [
                            m('.comp-push-panel.comp-push-panel-compose-left.comp-push-compose', [
                                m('.comp-push-panel-half', [
                                    m('div', [
                                        m('h4', t('pu.po.tab2.message.type')),
                                        m.component(window.components.segmented, {
                                            options: [
                                                { value: push.C.TYPE.MESSAGE, title: t('pu.type.message') },
                                                { value: push.C.TYPE.DATA, title: t('pu.type.data') },
                                            ], value: message.type, class: 'comp-push-message-type', onchange: function (type) {
                                                if (type === 'data' && !message.data()) { message.data(''); }
                                                if (type === 'message' && message.data() === '') { message.data(undefined); }
                                                if (type === 'data' && message.sound()) { message.sound(undefined); }
                                                if (type === 'message' && !message.sound()) { message.sound('default'); }
                                            }
                                        }),
                                    ]),
                                    message.type() !== 'data' ? m('div', [
                                        m('h4', t('pu.po.tab2.mbtns')),
                                        m.component(window.components.segmented, {
                                            options: [
                                                { value: 0, title: '0' },
                                                { value: 1, title: '1' },
                                                { value: 2, title: '2' },
                                            ], value: message.buttons
                                        }),
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
                                    // message.platforms().length > 1 ? 
                                    m.component(window.components.segmented, {
                                        class: 'platforms', options: [
                                            { value: push.C.PLATFORMS.IOS, view: m.bind(m, 'span.ion-social-apple') },
                                            { value: push.C.PLATFORMS.ANDROID, view: m.bind(m, 'span.ion-social-android') },
                                        ].filter(function (o) { return message.platforms().indexOf(o.value) !== -1; }), value: popup.previewPlatform
                                    }),
                                    // : '',
                                ]) :
                                ''
                        ]),
                        m('.btns', [
                            m('a.btn-next', { href: '#', onclick: popup.next, disabled: popup.tabenabled(4) ? false : 'disabled' }, t('pu.po.next')),
                            popup.tabs.tab() > 0 ? m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev')) : ''
                        ])
                    ]);
                }
            },

            // Review & Send
            {
                tab: this.renderTab.bind(this, 4),
                controller: function () {

                },
                view: function () {
                    return m('div.comp-push-tab-content.comp-summary', [
                        m('div.comp-panel', { style: { width: "590px" } }, [
                            m('div.form-group', { key: "tab_4_3" }, [
                                m('label.block-label', t('pu.po.confirm')),
                                m('input[type=checkbox]', { checked: message.ack() ? 'checked' : undefined, onchange: function () { message.ack(!message.ack()); } }),
                                m('label', { onclick: function () { message.ack(!message.ack()); } }, t.n('pu.po.confirm', message.count()))
                            ]),
                            m('div.form-group', { key: "tab_4_0" }, [
                                m('label.block-label', t('pu.po.auto.tab4.app-platforms')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.app')),
                                        m('div.comp-grid-cell', message.appNames()[0])
                                    ]),
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t.p('pu.po.auto.tab4.platforms', message.platforms().length)),
                                        m('div.comp-grid-cell', message.platforms().map(function (platform) { return platform === push.C.PLATFORMS.IOS ? t('pu.po.auto.tab4.platforms-ios') : t('pu.po.auto.tab4.platforms-android'); }).join(', '))
                                    ]),
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.send-to-test')),
                                        m('div.comp-grid-cell', message.test() ? t('pu.po.auto.tab4.yes') : t('pu.po.auto.tab4.no'))
                                    ])
                                ])
                            ]),
                            m('div.form-group', { key: "tab_4_1" }, [
                                m('label.block-label', t('pu.po.auto.tab4.campaign-rules')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.trigger-type')),
                                        m('div.comp-grid-cell', message.autoTriggerType() === push.C.TRIGGER_TYPE.COHORT_ENTRY ? t('pu.po.auto.tab4.trigger-cohort-entry') : t('pu.po.auto.tab4.trigger-cohort-exit'))
                                    ]),
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t.p('pu.po.auto.tab4.cohorts', message.autoCohorts().length)),
                                        m('div.comp-grid-cell', message.autoCohorts().map(function (cohort) { return cohort.title(); }).join(', '))
                                    ]),
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.caping')),
                                        m('div.comp-grid-cell', t.p('pu.po.auto.tab4.caping-message', message.messagePerUser()))
                                    ])
                                ])
                            ]),
                            m('div.form-group', { key: "tab_4_2" }, [
                                m('label.block-label', t('pu.po.auto.tab4.message-content')),
                                m('div.comp-grid', [
                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.message-type')),
                                        m('div.comp-grid-cell', message.type() === push.C.TYPE.MESSAGE ? t('pu.po.auto.tab4.message-type-push-message') : t('pu.po.auto.tab4.message-type-data'))
                                    ]),
                                    message.type() === push.C.TYPE.MESSAGE ?
                                        m('div.comp-grid-row', [
                                            m('div.comp-grid-cell', t('pu.po.auto.tab4.message-title')),
                                            m('div.comp-grid-cell', message.messagePerLocale()["default|t"])
                                        ]) : "",

                                    message.type() === push.C.TYPE.MESSAGE ?
                                        m('div.comp-grid-row', [
                                            m('div.comp-grid-cell', t('pu.po.auto.tab4.message-text')),
                                            m('div.comp-grid-cell', message.messagePerLocale()["default"])
                                        ]) : "",

                                    message.type() === push.C.TYPE.DATA ?
                                        m('div.comp-grid-row', [
                                            m('div.comp-grid-cell', t('pu.po.auto.tab4.message-type-data')),
                                            m('div.comp-grid-cell', JSON.stringify(message.data()))
                                        ]) : "",

                                    m('div.comp-grid-row', [
                                        m('div.comp-grid-cell', t('pu.po.auto.tab4.message-sound')),
                                        m('div.comp-grid-cell', message.sound() ? message.sound() : t('pu.po.auto.tab4.no'))
                                    ]),

                                    message.media() && message.media().length > 0 ?
                                        m('div.comp-grid-row', [
                                            m('div.comp-grid-cell', t('pu.po.auto.tab4.message-media')),
                                            m('div.comp-grid-cell', t('pu.po.auto.tab4.yes'))
                                        ]) : "",

                                    message.badge() && message.badge() > 0 ?
                                        m('div.comp-grid-row', [
                                            m('div.comp-grid-cell', 'pu.po.auto.tab4.message-badge'),
                                            m('div.comp-grid-cell', message.badge())
                                        ]) : ""
                                ])
                            ]),
                            m('.btns.final', [
                                m('div.final-footer', [
                                    m('div', [
                                        m('div', { key: 'info-message' }, t.p('pu.po.recipients.message', message.count())),
                                        m('div', t('pu.po.recipients.message.details')),
                                    ]),
                                    m('div', [
                                        m('a.btn-next', { href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled' }, t('pu.po.send')),
                                        m('a.btn-prev', { href: '#', onclick: popup.prev }, t('pu.po.prev'))
                                    ])
                                ])

                            ])
                        ])
                    ]);
                }
            }
        ], { stepbystep: true, tabenabled: this.tabenabled, tabset: this.next });

    };

    popup.view = function (ctrl) {
        return m('div.comp-push', window.components.tabs.view(ctrl.tabs));
    };

});