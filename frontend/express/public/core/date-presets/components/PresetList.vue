<template>
    <div class="preset-list">

        <div class="preset-list__header">
            <div class="bu-level">
                <el-button @click="createNewPreset" type="primary" size="small" plain v-if="allowCreate">+ {{ i18n('management.preset.create-button') }}</el-button>
                <el-button @click="navigateToManagement" type="text" size="small" v-tooltip="i18n('management.preset.manage-button-tooltip')">{{ i18n('common.manage') }}</el-button>
            </div>
        </div>

        <div class="preset-list__body" v-loading="isLoading">
            <vue-scroll :ops="scrollOps">
                <draggable
                    handle=".drag-handler"
                    v-model="presets"
                    @change="onChange"
                >
                    <div class="preset drag-handler bu-mx-4" :key="idx" v-for="(preset, idx) in presets" @click="onPresetClick(preset)" :class="{'preset--selected':  preset._id === selectedPresetId}">
                        <div class="bu-mb-1 bu-is-flex">
                            <span class="has-ellipsis text-medium font-weight-bold color-cool-gray-100">{{ preset.name }}</span>
                            <cly-check
                                class="bu-pl-1"
                                element-loading-spinner="el-icon-loading"
                                @input="toggleFav(preset)"
                                :value="preset.fav"
                                skin="star"
                            >
                            </cly-check>
                        </div>
                        <div class="text-medium color-cool-gray-50">{{ preset.range_label }}</div>
                    </div>
                </draggable>
            </vue-scroll>
        </div>

        <preset-drawer :controls="drawers['preset']" @open-drawer="onOpenDrawer" @close-drawer="onCloseDrawer"></preset-drawer>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyPresets from '../store/index.js';

import PresetDrawer from './PresetDrawer.vue';
import ClyCheck from '../../../javascripts/components/input/check.vue';

var CV = countlyVue;

export default {
    components: {
        PresetDrawer,
        ClyCheck
    },
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.hasDrawers("preset")
    ],
    props: {
        isGlobalDatePicker: {
            type: Boolean
        },
        allowCreate: {
            type: Boolean,
            default: true
        },
        localPresetId: {
            type: String
        }
    },
    data: function() {
        return {
            scrollOps: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false,
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false
                }
            },
            selectedPresetId: null
        };
    },
    beforeCreate: function() {
        this.module = countlyPresets.getVuexModule();
        CV.vuex.registerGlobally(this.module);
    },
    created: function() {
        this.refresh();

        if (this.isGlobalDatePicker) {
            this.selectedPresetId = this.globalPresetId;
        }

        if (this.localPresetId) {
            this.selectedPresetId = this.localPresetId;
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch("countlyPresets/getAll");
        },
        onChange: function({moved}) {
            if (moved) {
                var self = this;
                var preset = moved.element;
                preset.sort_order = moved.newIndex;
                this.$store.dispatch("countlyPresets/update", preset).then(function() {
                    self.refresh();
                });

            }
        },
        toggleFav: function(preset) {
            var self = this;
            preset.fav = !preset.fav;
            if (preset.fav) {
                preset.sort_order = 0;
            }
            this.$store.dispatch("countlyPresets/update", preset).then(function() {
                self.refresh();
            });
        },
        createNewPreset: function() {
            var emptyPreset = countlyPresets.factory.getEmpty();
            emptyPreset.__action = "create";
            this.openDrawer("preset", emptyPreset);
        },
        navigateToManagement: function() {
            window.app.navigate("/manage/date-presets", true);
        },
        onOpenDrawer: function() {
            var dropdown = document.getElementById("cly-datepicker");
            if (dropdown) {
                dropdown.style.visibility = "hidden";
            }
            var drawer = document.getElementById("preset-drawer");
            if (drawer) {
                drawer.style.visibility = "visible";
            }
        },
        onCloseDrawer: function() {
            var dropdown = document.getElementById("cly-datepicker");
            if (dropdown) {
                dropdown.style.visibility = "visible";
            }
            this.refresh();
        },
        onPresetClick: function(preset) {
            this.selectedPresetId = preset._id;

            if (this.isGlobalDatePicker) {
                this.globalPresetId = this.selectedPresetId;
            }

            this.$emit("preset-selected", this.selectedPreset);
        }
    },
    computed: {
        presets: function() {
            return this.$store.getters["countlyPresets/presets"] || [];
        },
        globalPresetId: {
            get: function() {
                return countlyPresets.getGlobalDatePresetId();
            },
            set: function(id) {
                if (id) {
                    countlyPresets.setGlobalDatePresetId(id);
                }
                else {
                    countlyPresets.clearGlobalDatePresetId();
                }
            }
        },
        isLoading: function() {
            return this.$store.getters["countlyPresets/isLoading"];
        },
        selectedPreset: function() {
            var self = this;
            return this.presets.find(function(p) {
                return p._id === self.selectedPresetId;
            });
        }
    }
};
</script>
