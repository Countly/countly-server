'use strict';

/* jshint undef: true, unused: true */
/* globals m, $ */

window.component('multiselect', function (mselect) {
    mselect.controller = function (opts) {
        if (!(this instanceof mselect.controller)) {
            return new mselect.controller(opts);
        }

        this.opts = opts;
        this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
        this.options = m.prop(opts.options.map(window.components.selector.Option));
        this.isOpen = false;
        this.onMultiSelectClick = function () {
            this.isOpen = !this.isOpen;
        };
        this.hideDropDown = function () {
            m.startComputation();
            this.isOpen = false;
            m.endComputation();
        };
    };
    mselect.view = function (ctrl) {
        // var unSelectedData = ctrl.data.filter(function (data) { return ctrl.selected.indexOf(data) < 0 });

        var unSelectedData = ctrl.options().filter(function(o){ return !o.selected();});

        var selectedData = ctrl.options().filter(function(o){ return o.selected();});

        return m('div.cly-multi-select', {
            class: selectedData.length > 0 ? "selection-exists" : "",
            style: "width:100%",
            data: ctrl.selected,
            config: function (elm, isInitialized) {
                if (!isInitialized) {
                    $(window).click(ctrl.hideDropDown.bind(ctrl));
                }
            },
            onclick: function (e) {
                ctrl.onMultiSelectClick();
                e.stopPropagation();
            },
        }, [
                m('.select-inner', [
                    m('.text-container', [
                        m('.text', [
                            m('.default-text', ctrl.opts.placeholder),
                            ctrl.value()
                                .filter(function(o) { return o.selected(); })
                                .map(function (o) {
                                return m('.selection', { "data-value": o.value() }, [
                                    m('span', o.title()),
                                    m('.remove', {
                                        onclick: function (e) {
                                            e.stopPropagation();
                                            o.selected(false);
                                            ctrl.value(ctrl.options());
                                        }
                                    }, m('i.ion-android-close'))
                                ]);
                            })
                        ])
                    ]),
                    m('.right combo')
                ]),
                m('.select-items square', {
                    style: {
                        width: "100%",
                        display: (ctrl.isOpen && unSelectedData.length > 0 ? 'block' : 'none')
                    }
                }, unSelectedData.map(function (data) {
                        return m('.item', {
                            "data-value": data.value(),
                            onclick: function (e) {
                                e.stopPropagation();
                                data.selected(true);
                                ctrl.value(ctrl.options());
                                ctrl.isOpen = false;
                            }
                        }, data.title());
                    })
                )
            ]);
    };
});