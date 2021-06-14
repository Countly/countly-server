/*global window, countlyVue, Vue */
(function (countlyCommonEvents) {
    countlyCommonEvents.helpers = {
    };
    var _mixins = countlyVue.mixins;
    Vue.component("cly-events-breakdown-horizontal-tile", countlyVue.views.BaseView.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            trend: {
                type: String
            },
            change: {
                type: String
            }
        },
        template: '<div class="cly-events-breakdown-horizontal-tile bu-column bu-is-4">\
        <div class="cly-events-breakdown-horizontal-tile__wrapper">\
        <slot name="title"></slot>\
            <div class="cly-events-breakdown-horizontal-tile__values-list bu-columns bu-is-gapless bu-is-multiline bu-is-mobile">\
                <div class="bu-column bu-is-12">\
                    <div class="cly-events-breakdown-horizontal-tile__item">\
                        <div class="bu-level bu-is-mobile cly-events-breakdown-horizontal-tile__item-title">\
                            <div class="bu-level-left">\
                                <div class="bu-level-item">\
                                <slot name="countValue"></slot>\
                                <span v-if="trend === \'u\'" class="cly-events-breakdown-horizontal-tile--green"><i class="fas fa-arrow-up"></i>{{change}}</span>\
                                <span v-else class="cly-events-breakdown-horizontal-tile--red"><i class="fas fa-arrow-down"></i>{{change}}</span>\
                                </div>\
                            </div>\
                            <slot name="totalPercentage">\
                            </slot>\
                        </div>\
                        <slot name="progressBar"></slot>\
                    </div>\
                </div>\
            </div>\
        </div>\
    </div>'
    }));
})((window.countlyCommonEvents = window.countlyCommonEvents || {}));