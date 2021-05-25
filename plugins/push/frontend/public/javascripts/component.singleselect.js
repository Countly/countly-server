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
        this.icon = opts.icon || '';
        this.filter = m.prop();

        this.isOpen = false;
        this.onSelectClick = function (ev) {
            this.isOpen = !this.isOpen;
            if (opts.onclick) {
                opts.onclick(ev);
            }
        };
        this.hideDropDown = function () {
            m.startComputation();
            this.isOpen = false;
            m.endComputation();
        };
    };
    sselect.view = function (ctrl) {

        var selected = ctrl.options().find(function (o) {
            return (('' + ctrl.value()) === ('' + o.value()));
        });

        return m('div.comp-singleselect.cly-select.text-align-left' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {
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
                    ctrl.onSelectClick(e);
                    e.stopPropagation();
                }
            }, [
                m('.text-container', [
                    selected
                        ? m('.text', { 'data-value': selected.value() }, [
                            ctrl.icon,
                            m('.default-text', selected.title())
                        ])
                        : m('.text', [
                            ctrl.icon,
                            m('.default-text', ctrl.opts.placeholder)
                        ])
                ]),
                m('.right combo')
            ]),
            m('.srch', {onclick: function(ev){ ev.stopPropagation(); }, style: {display: ctrl.isOpen ? 'block' : 'none'}}, m('.inner', [
                m('input[type=search]', {placeholder: t('push.search'), value: ctrl.filter() || '', oninput: m.withAttr('value', ctrl.filter)}),
                m('i.fa.fa-search')
            ])),
            m('.select-items square', {
                style: {
                    width: '100%',
                    display: ctrl.isOpen ? 'block' : 'none'
                }
            }, m('.scroll-list', {
                style: {
                    'overflow-y': 'none'
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
                    .filter(function(o){
                        return !ctrl.filter() || o.value() === undefined || o.title().toLowerCase().indexOf(ctrl.filter().toLowerCase().trim()) !== -1;
                    })
                    .map(function (o) {
                            return o.value() !== undefined && o.value() !== null && o.value() !== '' ? 
                            m('.item.scrollable', {'data-value': o.value(), onclick: function(e){
                                e.stopPropagation();
                                if (typeof ctrl.value === 'function')
                                    ctrl.value.apply(this, [o.value()]);
                                ctrl.hideDropDown();
                            }}, o.title()) 
                            :
                            m('.group', o.title());
                    })
            ]))
            )
        ]);
    };
});