'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('singleselect', function (sselect) {
    sselect.controller = function (opts) {
        if (!(this instanceof sselect.controller)) {
            return new sselect.controller(opts);
        }

        this.opts = opts;
        this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
        this.options = m.prop(opts.options.map(window.components.selector.Option));

        this.isOpen = false;
        this.onSelectClick = function () {
            this.isOpen = !this.isOpen;
        }
        this.hideDropDown = function () {
            m.startComputation();
            this.isOpen = false;
            m.endComputation();
        }
    };
    sselect.view = function (ctrl) {

        var selected = ctrl.options().find(function (o) {
            return (('' + ctrl.value()) === ('' + o.value()));
        });

        return m('div.cly-select-component.text-align-left', {
            style: "width:100%",
            config: function (elm) {
                var container = $(elm);
                $(window).unbind('click.' + ctrl.opts.id).bind('click.' + ctrl.opts.id,  function(e){
                    if (container && !container.is(e.target) && container.has(e.target).length === 0) {
                        ctrl.hideDropDown();
                    }
                });
            }
        }, [
                m('.select-inner', {
                    onclick: function (e) {
                        e.stopPropagation();
                        ctrl.onSelectClick();

                    }
                }, [
                        m('.text-container', [
                            selected
                                ? m('.text', { "data-value": selected.value() }, [
                                    m('.default-text', selected.title())
                                ])
                                : m('.text', [
                                    m('.default-text.text-light-gray', ctrl.opts.placeholder)
                                ])
                        ]),
                        m('.right combo')
                    ]),
                m('.select-items-component square', {
                    style: {
                        width: "100%",
                        display: ctrl.isOpen ? 'block' : 'none'
                    }
                }, m('.scroll-list', {
                    style: {
                        "overflow-y": "none"
                    },
                    config: function (el) {
                        if (ctrl.isOpen && !$(el).parent().hasClass('slimScrollDiv') && ctrl.options().length >= 10) {
                            $(el).slimScroll({
                                height: '100%',
                                start: 'top',
                                wheelStep: 10,
                                position: 'right',
                                disableFadeOut: true,
                                allowPageScroll: true,
                                alwaysVisible: true
                            });
                        }
                    }
                }, m('.items', [
                    ctrl.options()
                        .map(function (o) {
                            return m('.item', {
                                "data-value": o.value(),
                                onclick: function (e) {
                                    e.stopPropagation();
                                    if (typeof ctrl.value === 'function')
                                        ctrl.value.apply(this, [o.value()]);
                                    ctrl.hideDropDown();
                                }
                            },
                                o.title())
                        })
                ]))
                )
            ]);
    };
});