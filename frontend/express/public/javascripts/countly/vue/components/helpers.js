/* global Vue, app */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.component("cly-back-link", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                title: {type: String, required: false},
                link: {type: String, required: false}
            },
            methods: {
                back: function() {
                    if (this.link) {
                        app.back(this.link);
                    }
                    else {
                        app.back();
                    }
                }
            },
            computed: {
                innerTitle: function() {
                    if (this.title) {
                        return this.title;
                    }
                    return this.i18n("common.back");
                }
            },
            template: '<a @click="back" class="cly-vue-back-link"> \n' +
                            '<span>{{innerTitle}}</span>\n' +
                        '</a>'
        }
    ));

    Vue.component("cly-diff-helper", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            diff: {
                type: Array
            },
        },
        computed: {
            hasDiff: function() {
                return this.diff.length > 0;
            },
            madeChanges: function() {
                return this.i18n("common.diff-helper.changes", this.diff.length);
            }
        },
        methods: {
            save: function() {
                this.$emit("save");
            },
            discard: function() {
                this.$emit("discard");
            }
        },
        template: '<div class="cly-vue-diff-helper" v-if="hasDiff">\n' +
                        '<div class="message">\n' +
                            '<span class="text-dark">{{madeChanges}}</span>\n' +
                            '<span class="text-light">{{ i18n("common.diff-helper.keep") }}</span>\n' +
                        '</div>\n' +
                        '<div class="buttons">\n' +
                            '<cly-button :label="i18n(\'common.discard-changes\')" skin="light" class="discard-btn" @click="discard"></cly-button>\n' +
                           '<cly-button :label="i18n(\'common.save-changes\')" skin="green" class="save-btn" @click="save"></cly-button>\n' +
                        '</div>\n' +
                    '</div>'
    }));



    Vue.component("cly-breakdown-tile", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            name: {
                type: String
            },
            type: {
                default: 'multi',
                type: String
            },
            values: {
                type: Array
            }
        },
        template: '<div class="cly-vue-breakdown-tile bu-column bu-is-4">\
                        <div class="cly-vue-breakdown-tile__wrapper bu-p-5">\
                            <h4 class="text-uppercase text-small font-weight-bold">{{name}}</h4>\
                            <div class="cly-vue-breakdown-tile__values-list bu-columns bu-is-gapless bu-is-multiline bu-is-mobile" v-if="type === \'multi\'">\
                                <div v-for="item in values" class="bu-column bu-is-12">\
                                    <div class="cly-vue-breakdown-tile__item">\
                                        <div class="bu-level bu-is-mobile cly-vue-breakdown-tile__item-title">\
                                            <div class="bu-level-left">\
                                                <div class="bu-level-item text-medium">\
                                                    <img v-if="item.icon" :src="item.icon"/>{{item.name}}\
                                                </div>\
                                            </div>\
                                            <div class="bu-level-right">\
                                                <div class="bu-level-item text-medium">\
                                                    <a :href="item.link">{{item.description}} ({{item.percent}}%)</a>\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div>\
                                            <progress class="bu-progress bu-is-link" :value="item.percent" max="100">{{item.percent}}%</progress>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
