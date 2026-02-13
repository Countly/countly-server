<template>
<div v-bind:class="[componentId]" class="configurations">
    <cly-header
        :title="back ? i18n('plugins.search-settings') : i18n('plugins.configs')"
    >
        <template v-slot:header-top>
            <cly-back-link :title="i18n('plugins.back-to-settings')" v-if="back" link="#/manage/configurations"></cly-back-link>
        </template>
        <template v-slot:header-right class="cly-vue-listbox__header bu-p-3">
            <form>
            <el-input
                test-id="search-in-settings-input"
                ref="searchBox"
                autocomplete="off"
                v-model="searchQuery"
                :placeholder="searchPlaceholder"
                @focus="onFocus"
                @keyup.enter.native="onEnterSearch"
            >
                <i slot="prefix" class="el-input__icon el-icon-search"></i>
                <i slot="suffix" class="el-input__icon el-icon-circle-close" @click="clearSearch"></i>
            </el-input>
        </form>
        </template>
    </cly-header>
    <cly-main class="bu-pt-4">
        <div v-if="!back" class="bu-columns bu-is-gapless">
            <div class="bu-column bu-is-3 bu-mr-5" style="max-height:681px; max-width:223px">
                <cly-listbox
                    test-id="configurations-listbox"
                    skin="jumbo"
                    height="624"
                    searchPlaceholder="Search"
                    :options="configsList"
                    :searchable="false"
                    v-model="selectedConfigSearchBar">
                </cly-listbox>
            </div>
            <div class="bu-column bu-is-9 selected-config" v-if="predefinedStructure[selectedConfig]">
                <form>
                    <h2 class="bu-mb-4" :data-test-id="'selected-config-name-label-' + selectedConfigName.toLowerCase().replaceAll(/\s/g, '-')"> {{selectedConfigName}} </h2>
                    <div v-if="predefinedStructure[selectedConfig].description" class="bu-mb-4 text-medium" :data-test-id="'selected-config-description-label-' + selectedConfigName.toLowerCase().replaceAll(/\s/g, '-')">{{i18n(predefinedStructure[selectedConfig].description)}}</div>
                    <div :id="group.label" :key="index" v-for="(group, index) in predefinedStructure[selectedConfig].groups">
                        <h3 v-if="predefinedStructure[selectedConfig].groups.length > 1 || group.label" class="bu-my-4" :data-test-id="'selected-config-group-label-' + i18n(group.label).toLowerCase().replaceAll(/\s/g, '-')">
                            {{group.label && i18n(group.label)}}
                            <cly-tooltip-icon class="ion ion-help-circled" placement="bottom"></cly-tooltip-icon>
                        </h3>
                        <cly-section class="bu-mr-5">
                            <template slot-scope="scope">
                                <div
                                    v-if="key !== '_user' && configsData[selectedConfig] && typeof configsData[selectedConfig][key] !== 'undefined'"
                                    v-for="key in group.list" :key="key"
                                    class="bu-columns bu-is-vcentered bu-p-5 config-section">
                                    <div class="bu-column bu-is-7">
                                        <div class="bu-has-text-weight-medium bu-is-flex bu-is-align-items-center config-section__header">
                                            <div>
                                                <span class="bu-mr-2" :data-test-id="'settings-title-label-' + key.toLowerCase().replaceAll('_', '-')"> {{ getLabelName(key) }} </span>
                                            </div>
                                            <div
                                                class="bu-is-flex bu-is-align-items-center"
                                            >
                                                <div
                                                    v-for="(tag, index) in getWarningTags(selectedConfig, key)"
                                                    :key="index"
                                                    class="bu-is-flex bu-is-align-items-center bu-is-justify-content-center bu-mr-2"
                                                >
                                                    <div
                                                        :style="{ backgroundColor: tag.bgColor }"
                                                        v-tooltip="tag.tooltipText"
                                                        class="configuration-warning-container"

                                                    >
                                                        <span
                                                            class="configuration-warning-container__text"
                                                            :style="{ color: tag.textColor }"
                                                        >
                                                            {{ tag.label }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p class="bu-has-text-weight-normal bu-mt-2 bu-mb-0" v-html="getHelperLabel(key)" v-if="getHelperLabel(key)" :data-test-id="'settings-description-label-' + key.toLowerCase().replaceAll('_', '-')"></p>
                                        <div v-if="checkIfOverwritten(key)" class="config-section-overwritten">
                                            <a :href="checkIfOverwritten(key).href" target="_blank">{{checkIfOverwritten(key).label}}</a>
                                        </div>
                                    </div>
                                    <div class="bu-column bu-is-2"></div>
                                    <div class="bu-column bu-is-3 bu-is-flex bu-is-justify-content-end bu-pb-1">
                                        <div
                                            v-if="getInputType(key) === 'function'"
                                            v-html="predefinedInputs[selectedConfig + '.' + key](configsData[selectedConfig][key])">
                                        </div>
                                        <el-input
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-input'"
                                            v-else-if="getInputType(key) === 'el-input'"
                                            :data-test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-textarea'"
                                            @input="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs"
                                            >
                                        </el-input>
                                        <el-select
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-')"
                                            v-else-if="getInputType(key) === 'el-select'"
                                            @change="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                            <el-option :key="option.value" :value="option.value" :label="option.label" v-for="option in predefinedInputs[selectedConfig + '.' + key].list"></el-option>
                                        </el-select>
                                        <el-slider
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-')"
                                            v-else-if="getInputType(key) === 'el-slider'"
                                            @change="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                        </el-slider>
                                        <el-button
                                            :data-test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-button'"
                                            v-else-if="getInputType(key) === 'el-button'"
                                            @click="predefinedInputs[selectedConfig + '.' + key].click()"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                            {{predefinedInputs[selectedConfig + '.' + key].label}}
                                        </el-button>
                                        <el-switch
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-')"
                                            v-else-if="getInputType(key) === 'el-switch'"
                                            @change="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                        </el-switch>
                                        <el-input-number
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-input-number'"
                                            v-else-if="getInputType(key) === 'el-input-number'"
                                            @change="onChange(key, $event)"
                                            :max='2147483647'
                                            :min='0'
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                        </el-input-number>
                                        <el-color-picker
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-color-picker'"
                                            v-else-if="getInputType(key) === 'el-color-picker'"
                                            @change="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                        </el-color-picker>
                                        <cly-colorpicker
                                            :test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-color-picker'"
                                            v-else-if="getInputType(key) === 'cly-colorpicker'"
                                            v-model="configsData[selectedConfig][key]"
                                            :value="configsData[selectedConfig][key]"
                                            @change="onChange(key,configsData[selectedConfig][key])"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs"
                                            style="display:inline">
                                        </cly-colorpicker>
                                        <el-upload
                                            :data-test-id="'settings-' + key.toLowerCase().replaceAll('_', '-') + '-upload'"
                                            v-else-if="getInputType(key) === 'image'"
                                            :show-file-list="false"
                                            :before-upload="predefinedInputs[selectedConfig + '.' + key].before"
                                            :on-success="predefinedInputs[selectedConfig + '.' + key].success"
                                            :on-error="predefinedInputs[selectedConfig + '.' + key].error"
                                            v-bind="predefinedInputs[selectedConfig + '.' + key].attrs">
                                            <div :class="predefinedInputs[selectedConfig + '.' + key].image_size">
                                                <div v-if="configsData[selectedConfig][key]" class="image-delete bu-is-flex">
                                                    <el-button
                                                    :test-id="'settings-' + getLabelName(key).toLowerCase().replaceAll(/\s/g, '-')"
                                                    size="small"
                                                    type="text"
                                                    @click.stop="onChange(key, '')"
                                                    class="bu-p-0">{{i18n('management-users.remove-image')}}</el-button>
                                                    <img v-if="selectedConfig==='feedback'":src="'/feedback/preview/' + configsData[selectedConfig][key] + '?' + Date.now()">
                                                    <img v-else :src="'/white-label/preview/' + configsData[selectedConfig][key] + '?' + Date.now()">
                                                </div>
                                                <div v-else class="bu-is-flex">
                                                    <el-button type="default" style="display:flex;margin:auto;">{{i18n('white-labeling.choose-file')}}</el-button>
                                                    <el-button type="default" disabled style="width: 165px;height: 50px;cursor: default;">{{i18n('white-labeling.logo-preview')}}</el-button>
                                                </div>
                                            </div>
                                            <span class="config-error">{{predefinedInputs[selectedConfig + '.' + key].errorMessage || ""}}</span>
                                        </el-upload>
                                        <el-input
                                            v-else
                                            @input="onChange(key, $event)"
                                            :value="configsData[selectedConfig][key]">
                                        </el-input>
                                    </div>
                                </div>
                            </template>
                        </cly-section>
                    </div>
                </form>
            </div>
        </div>
        <div v-else>
            <cly-empty-view
                v-if="Object.keys(searchResultStructure).length === 0"
                style="opacity:1"
                :title="i18n('configs.start-search')"
                :subTitle="i18n('configs.start-search-description')"
            >
                <template v-slot:icon>
                    <img :src="'images/icons/start-search.svg'">
                </template>
            </cly-empty-view>
            <cly-empty-view
                v-if="searchResultStructure.empty"
                style="opacity:1"
                :title="i18n('configs.no-search-result')"
                :subTitle="i18n('configs.no-search-result-description')"
            >
                <template v-slot:icon>
                    <img :src="'images/icons/no-search-result.svg'">
                </template>
            </cly-empty-view>
            <div v-else v-for="(config, configKey) in searchResultStructure" :key="configKey">
                <h2 class="bu-mb-4 bu-mt-4 bu-has-text-weight-medium">
                    <a :href="redirectToConfig(configKey)">
                        {{getConfigType(configKey)}}
                        <i class="el-icon-arrow-right"></i>
                        {{getLabel(configKey)}}
                    </a>
                </h2>
                <div v-for="(group, index) in config.groups" :key="index">
                    <h3 v-if="config.groups.length > 1 || group.label" class="bu-my-4">
                        <a :href="redirectToConfig(configKey, group.label)">
                            {{group.label && i18n(group.label)}}
                            <cly-tooltip-icon class="ion ion-help-circled" placement="bottom"></cly-tooltip-icon>
                        </a>
                    </h3>
                    <cly-section class="bu-mr-5">
                        <template slot-scope="scope">
                            <div
                                v-if="key !== '_user' && configsData[configKey] && typeof configsData[configKey][key] !== 'undefined'"
                                v-for="key in group.list" :key="key"
                                class="bu-columns bu-is-vcentered bu-p-5 config-section"
                            >
                                <div class="bu-column bu-is-7">
                                    <p class="bu-has-text-weight-medium">{{getLabelName(key, configKey)}}</p>
                                    <p class="bu-has-text-weight-normal bu-mt-2" v-html="getHelperLabel(key, configKey)" v-if="getHelperLabel(key, configKey)"></p>
                                    <div v-if="checkIfOverwritten(key, configKey)" class="config-section-overwritten">
                                        <a :href="checkIfOverwritten(key, configKey).href" target="_blank">{{checkIfOverwritten(key, configKey).label}}</a>
                                    </div>
                                </div>
                                <div class="bu-column bu-is-3 bu-is-flex bu-is-justify-content-end">
                                    <div
                                        v-if="getInputType(key, configKey) === 'function'"
                                        v-html="predefinedInputs[configKey + '.' + key](configsData[configKey][key])">
                                    </div>
                                    <el-input
                                        v-else-if="getInputType(key, configKey) === 'el-input'"
                                        @input="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs"
                                        >
                                    </el-input>
                                    <el-select
                                        v-else-if="getInputType(key, configKey) === 'el-select'"
                                        @change="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                        <el-option :key="option.value" :value="option.value" :label="option.label" v-for="option in predefinedInputs[configKey + '.' + key].list"></el-option>
                                    </el-select>
                                    <el-slider
                                        v-else-if="getInputType(key, configKey) === 'el-slider'"
                                        @change="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                    </el-slider>
                                    <el-button
                                        v-else-if="getInputType(key, configKey) === 'el-button'"
                                        @click="predefinedInputs[configKey + '.' + key].click()"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                        {{predefinedInputs[configKey + '.' + key].label}}
                                    </el-button>
                                    <el-switch
                                        v-else-if="getInputType(key, configKey) === 'el-switch'"
                                        @change="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                    </el-switch>
                                    <el-input-number
                                        v-else-if="getInputType(key, configKey) === 'el-input-number'"
                                        @change="onChange(key, $event, configKey)"
                                        :max='2147483647'
                                        :min='0'
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                    </el-input-number>
                                    <el-color-picker
                                        v-else-if="getInputType(key, configKey) === 'el-color-picker'"
                                        @change="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                    </el-color-picker>
                                    <cly-colorpicker
                                        v-else-if="getInputType(key, configKey) === 'cly-colorpicker'"
                                        v-model="configsData[configKey][key]"
                                        :value="configsData[configKey][key]"
                                        @change="onChange(key,configsData[configKey][key], configKey)"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs"
                                        style="display:inline">
                                    </cly-colorpicker>
                                    <el-upload
                                        v-else-if="getInputType(key, configKey) === 'image'"
                                        :show-file-list="false"
                                        :before-upload="predefinedInputs[configKey + '.' + key].before"
                                        :on-success="predefinedInputs[configKey + '.' + key].success"
                                        :on-error="predefinedInputs[configKey + '.' + key].error"
                                        v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                        <div :class="predefinedInputs[configKey + '.' + key].image_size">
                                            <div v-if="configsData[configKey][key]" class="image-delete bu-is-flex">
                                                <el-button
                                                size="small"
                                                type="text"
                                                @click.stop="onChange(key, '', configKey)"
                                                class="bu-p-0">{{i18n('management-users.remove-image')}}</el-button>
                                                <img :src="'/white-label/preview/' + configsData[configKey][key] + '?' + Date.now()">
                                            </div>
                                            <div v-else class="bu-is-flex">
                                                <el-button type="default" style="display:flex;margin:auto;">{{i18n('white-labeling.choose-file')}}</el-button>
                                                <el-button type="default" disabled style="width: 165px;height: 50px;cursor: default;">{{i18n('white-labeling.logo-preview')}}</el-button>
                                            </div>
                                        </div>
                                        <span class="config-error">{{predefinedInputs[configKey + '.' + key].errorMessage || ""}}</span>
                                    </el-upload>
                                    <el-input
                                        v-else
                                        @input="onChange(key, $event, configKey)"
                                        :value="configsData[configKey][key]">
                                    </el-input>
                                </div>
                            </div>
                        </template>
                    </cly-section>
                </div>
            </div>
        </div>
        <cly-diff-helper :diff="diff" @discard="unpatch" @save="save" :isModal="true">
            <template v-slot:main>
                <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                    <span class="selected-count-blue bu-pl-1 text-medium">
                        <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{diff.length}}</span>
                        <span v-if="diff.length>1" class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made") }}</span>
                        <span v-else class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made-single") }}</span>
                        <span v-if="diff.length>1" class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep") }}</span>
                        <span v-else class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep-single") }}</span>
                    </span>
                    <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                    <el-button skin="red" class="bu-mr-2" size="small" type="default" @click="save">
                        <i class="cly-io-16 cly-io cly-io-save-disc" style="font-size: larger;"></i>
                        <span class="bu-ml-1">
                            {{ i18n('dashboards.save-changes') }}
                        </span>
                    </el-button>
                    <el-button class="x-button" @click="unpatch">
                        <i class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                    </el-button>
                </div>
            </template>
        </cly-diff-helper>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify, isPluginEnabled } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import * as countlyPlugins from '../store/index.js';
import jQuery from 'jquery';

import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyBackLink from '../../../../../frontend/express/public/javascripts/components/helpers/cly-back-link.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClyListbox from '../../../../../frontend/express/public/javascripts/components/input/listbox.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyColorpicker from '../../../../../frontend/express/public/javascripts/components/input/colorpicker.vue';
import ClyEmptyView from '../../../../../frontend/express/public/javascripts/components/helpers/cly-empty-view.vue';
import ClyDiffHelper from '../../../../../frontend/express/public/javascripts/components/helpers/cly-diff-helper.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyHeader,
        ClyBackLink,
        ClyMain,
        ClyListbox,
        ClyTooltipIcon,
        ClySection,
        ClyColorpicker,
        ClyEmptyView,
        ClyDiffHelper,
    },
    computed: {
        predefinedLabels: function() {
            return this.$store.getters['countlyConfigurations/predefinedLabels'];
        },
        predefinedInputs: function() {
            return this.$store.getters['countlyConfigurations/predefinedInputs'];
        },
        predefinedStructure: function() {
            return this.$store.getters['countlyConfigurations/predefinedStructure'];
        },
        selectedConfigSearchBar: {
            get: function() {
                return this.selectedConfig;
            },
            set: function(value) {
                this.selectedConfig = value;
                this.diff = [];
                this.diff_ = {};
                try {
                    this.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
                }
                catch (ex) {
                    this.configsData = {};
                }

                if (this.configsData.frontend && this.configsData.frontend._user) {
                    this.configsData.frontend.__user = [];
                    for (var userProp in this.configsData.frontend._user) {
                        if (this.configsData.frontend._user[userProp]) {
                            this.configsData.frontend.__user.push(userProp);
                        }
                    }
                }
                app.navigate("#/manage/configurations/" + value);
            }
        },
        selectedConfigName: function() {
            return this.getLabel(this.selectedConfig);
        }
    },
    data: function() {
        return {
            back: this.$route.params.namespace === "search",
            configsData: {},
            configsList: [],
            coreDefaults: ['api', 'frontend', 'logs', 'security', 'tracking'],
            diff: [],
            diff_: {},
            selectedConfig: this.$route.params.namespace || "api",
            searchPlaceholder: i18n("configs.search-settings"),
            searchQuery: this.$route.params.searchQuery || "",
            searchResultStructure: {},
        };
    },
    beforeCreate: function() {
        var self = this;
        if (this.$route.params.success) {
            notify({
                title: jQuery.i18n.map["configs.changed"],
                message: jQuery.i18n.map["configs.saved"]
            });
            this.$route.params.success = false;
            app.noHistory("#/manage/configurations/" + this.$route.params.namespace || "api");
        }
        return jQuery.when(countlyPlugins.initializeConfigs())
            .then(function() {
                try {
                    self.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
                    self.removeNonGlobalConfigs(self.configsData);
                }
                catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(error);
                    self.configsData = {};
                }

                if (self.configsData.frontend && self.configsData.frontend._user && !self.predefinedInputs["frontend.__user"]) {
                    var list = [];
                    self.configsData.frontend.__user = [];
                    for (var userProp in self.configsData.frontend._user) {
                        list.push({value: userProp, label: self.getLabelName(userProp, "frontend")});
                        if (self.configsData.frontend._user[userProp]) {
                            self.configsData.frontend.__user.push(userProp);
                        }
                    }
                    self.$store.commit('countlyConfigurations/registerInput', {id: "frontend.__user", value: {input: "el-select", attrs: {multiple: true}, list: list}});
                }

                delete self.configsData.frontend.countly_tracking;

                self.configsList.push({
                    "label": self.getLabel("core"),
                    "group": true,
                    "value": "core"
                });
                self.coreDefaults.forEach(function(key) {
                    self.configsList.push({
                        "label": self.getLabel(key, true),
                        "value": key
                    });
                });
                self.configsList.push({
                    "label": self.getLabel("plugins"),
                    "group": true,
                    "value": "plugins"
                });
                var plugins = [];
                for (var key in self.configsData) {
                    if (self.coreDefaults.indexOf(key) === -1 && countlyGlobal.plugins.indexOf(key) !== -1) {
                        plugins.push(key);
                    }
                    if (!self.predefinedStructure[key]) {
                        self.predefinedStructure[key] = {groups: []};
                    }
                    var otherStructure = [];
                    for (var subkey in self.configsData[key]) {
                        if (!self.predefinedInputs[key + "." + subkey]) {
                            var type = typeof self.configsData[key][subkey];
                            if (type === "string") {
                                self.$store.commit('countlyConfigurations/registerInput', {id: key + "." + subkey, value: {input: "el-input", attrs: {}}});
                            }
                            else if (type === "number") {
                                self.$store.commit('countlyConfigurations/registerInput', {id: key + "." + subkey, value: {input: "el-input-number", attrs: {}}});
                            }
                            else if (type === "boolean") {
                                self.$store.commit('countlyConfigurations/registerInput', {id: key + "." + subkey, value: {input: "el-switch", attrs: {}}});
                            }
                        }
                        if (!self.predefinedStructure[key].groups.length) {
                            otherStructure.push(subkey);
                        }
                        else {
                            var found = false;
                            for (var i = 0; i < self.predefinedStructure[key].groups.length; i++) {
                                if (self.predefinedStructure[key].groups[i].list.indexOf(subkey) !== -1) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                otherStructure.push(subkey);
                            }
                        }
                    }
                    if (otherStructure.length) {
                        self.predefinedStructure[key].groups.push({label: "", list: otherStructure});
                    }
                }
                plugins.sort();
                plugins.forEach(function(k) {
                    self.configsList.push({
                        "label": self.getLabel(k, true),
                        "value": k
                    });
                });
                self.configsList.push({
                    "label": "Feedback",
                    "value": "feedback"
                });
                if (self.searchQuery !== "") {
                    self.onEnterSearch();
                    window.scrollTo({top: 0, behavior: "smooth"});
                }
            });
    },
    updated: function() {
        if (this.$route.params.section) {
            this.scrollToSection(this.$route.params.section);
        }
    },
    methods: {
        removeNonGlobalConfigs: function(configData) {
            Object.keys(configData).forEach(function(configKey) {
                if ((configData[configKey].use_google || configData[configKey].google_maps_api_key) && configKey === 'frontend') {
                    delete configData[configKey].use_google;
                    delete configData[configKey].google_maps_api_key;
                }
                if (configData[configKey].rate && configKey === 'push') {
                    delete configData[configKey].rate; // Note: push notification rate is app level config only
                }
                if (configData[configKey].test && configKey === 'push') {
                    delete configData[configKey].test; // Note: push notification test is app level config only
                }
            });
        },
        onChange: function(key, value, config) {
            var configsData = countlyPlugins.getConfigsData();

            config = config || this.selectedConfig;
            if (!this.diff_[config]) {
                this.diff_[config] = [];
            }

            //delete value from diff if it already exists
            var index = this.diff.indexOf(key);
            if (index > -1) {
                this.diff.splice(index, 1);
                index = this.diff_[config].indexOf(key);
                this.diff_[config].splice(index, 1);
            }

            this.configsData[config][key] = value;
            //when user disables country data tracking while city data tracking is enabled
            if (key === "country_data" && value === false && this.configsData[config].city_data === true) {
            //disable city data tracking
                this.configsData[config].city_data = false;
                //if city data tracking was originally enabled, note the change
                index = this.diff.indexOf("city_data");
                if (index > -1) {
                    this.diff.splice(index, 1);
                    index = this.diff_[config].indexOf("city_data");
                    this.diff_[config].splice(index, 1);
                }
                if (configsData[config].city_data === true) {
                    this.diff.push("city_data");
                    this.diff_[config].push("city_data");
                }
            }
            //when user enables city data tracking while country data tracking is disabled
            if (key === "city_data" && value === true && this.configsData[config].country_data === false) {
            //enable country data tracking
                this.configsData[config].country_data = true;
                //if country data tracking was originally disabled, note the change
                index = this.diff.indexOf("country_data");
                if (index > -1) {
                    this.diff.splice(index, 1);
                    index = this.diff_[config].indexOf("country_data");
                    this.diff_[config].splice(index, 1);
                }
                if (configsData[config].country_data === false) {
                    this.diff.push("country_data");
                    this.diff_[config].push("country_data");
                }
            }

            if (Array.isArray(value) && Array.isArray(configsData[config][key])) {
                value.sort();
                configsData[config][key].sort();

                if (JSON.stringify(value) !== JSON.stringify(configsData[config][key])) {
                    this.diff.push(key);
                    this.diff_[config].push(key);
                }
            }
            else if (configsData[config][key] !== value) {
                this.diff.push(key);
                this.diff_[config].push(key);
            }
        },
        getLabel: function(id) {
            return this.$store.getters['countlyConfigurations/getInputLabel'](id);
        },
        getLabelName: function(id, ns) {
            ns = ns || this.selectedConfig;
            if (this.coreDefaults.indexOf(ns) === -1 && ns !== "feedback" && countlyGlobal.plugins.indexOf(ns) === -1) {
                return null;
            }

            if (id === "__user") {
                return jQuery.i18n.map["configs.user-level-configuration"];
            }

            return this.$store.getters['countlyConfigurations/getInputLabel'](ns + "." + id);
        },
        getHelperLabel: function(id, ns) {
            ns = ns || this.selectedConfig;
            return this.$store.getters['countlyConfigurations/getHelperLabel'](id, ns);
        },
        getInputType: function(id, configId) {
            configId = configId || this.selectedConfig;
            return this.$store.getters['countlyConfigurations/getInputType'](configId + "." + id);
        },
        getConfigType: function(id) {
            return this.coreDefaults.includes(id) ? "Core" : "Plugins";
        },
        getWarningTags: function(configGroup, key) {
            var warnings = countlyPlugins.getConfigWarnings(configGroup, key);
            var tooltipColors = countlyPlugins.getTooltipColors();
            return warnings.map(function(warning) {
                return {
                    tooltipText: i18n(warning.text),
                    bgColor: tooltipColors[warning.type].bgColor,
                    textColor: tooltipColors[warning.type].textColor,
                    label: countlyPlugins.getTooltipLabel(warning.type)
                };
            });
        },
        checkIfOverwritten: function(id, ns) {
            ns = ns || this.selectedConfig;
            var configsData = countlyPlugins.getConfigsData();
            var plugs = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins;
            //check if value can be overwritten on user level
            if (configsData[ns]._user && configsData[ns]._user[id]) {
            //check if value is overwritten on user level
                var sets = countlyGlobal.member.settings;
                if (sets && sets[ns] && typeof sets[ns][id] !== "undefined") {
                    return {label: jQuery.i18n.map["configs.overwritten.user"], href: "#/account-settings"};
                }
            }
            //check if config overwritten on app level
            else if (plugs && plugs[ns] && typeof plugs[ns][id] !== "undefined") {
                return {label: jQuery.i18n.map["configs.overwritten.app"], href: "#/manage/apps"};
            }
        },
        unpatch: function() {
            try {
                this.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
            }
            catch (ex) {
                this.configsData = {};
            }
            this.diff = [];
            this.diff_ = {};
            if (this.configsData.frontend && this.configsData.frontend._user) {
                this.configsData.frontend.__user = [];
                for (var userProp in this.configsData.frontend._user) {
                    if (this.configsData.frontend._user[userProp]) {
                        this.configsData.frontend.__user.push(userProp);
                    }
                }
            }
        },
        save: function() {
            var changes = {};
            var self = this;
            for (var i = 0; i < Object.keys(self.diff_).length; i++) {
                var config = Object.keys(self.diff_)[i];
                changes[config] = {};
                for (var j = 0; j < self.diff_[config].length; j++) {
                    if (self.diff_[config][j] === "__user") {
                        if (!changes[config]._user) {
                            changes[config]._user = {};
                        }
                        for (var userProp in self.configsData[config]._user) {
                            if (self.configsData[config][self.diff_[config][j]].indexOf(userProp) === -1) {
                                changes[config]._user[userProp] = false;
                            }
                            else {
                                changes[config]._user[userProp] = true;
                            }
                        }
                    }
                    else {
                        changes[config][self.diff_[config][j]] = self.configsData[config][self.diff_[config][j]];
                    }
                }
            }
            countlyPlugins.updateConfigs(changes, function(err) {
                if (err) {
                    notify({
                        title: jQuery.i18n.map["configs.not-saved"],
                        message: jQuery.i18n.map["configs.not-changed"],
                        type: "error"
                    });
                }
                else {
                    if (self.back) {
                        location.hash += "/success";
                    }
                    else {
                        location.hash = "#/manage/configurations/" + self.selectedConfig + "/success";
                    }
                    window.location.reload(true);
                }
            });
        },
        onFocus: function() {
            if (this.searchQuery === "") {
                this.back = true;
                this.selectedConfigSearchBar = "search";
            }
        },
        onEnterSearch: function() {
            var self = this;
            self.unpatch();
            var res = {};
            if (self.searchQuery && self.searchQuery !== "") {
                self.searchQuery = self.searchQuery.toLowerCase();
                for (var config in self.predefinedStructure) {
                    if (config.toLowerCase().includes(self.searchQuery) && isPluginEnabled(config.toLowerCase())) {
                        res[config] = self.predefinedStructure[config];
                    }
                    else {
                        let groups = [];
                        // eslint-disable-next-line no-loop-func
                        self.predefinedStructure[config].groups.map(function(group) {
                            if (isPluginEnabled(config.toLowerCase())) {
                                if (group.label && i18n(group.label).toLowerCase().includes(self.searchQuery)) {
                                    groups.push(group);
                                }
                                else {
                                    let list = group.list.filter(function(item) {
                                        let label = self.getLabelName(item, config) || "";
                                        let helper = self.getHelperLabel(item, config) || "";
                                        return label.toLowerCase().includes(self.searchQuery)
                                || helper.toLowerCase().includes(self.searchQuery);
                                    });
                                    if (list.length > 0) {
                                        let tmp = group;
                                        tmp.list = list;
                                        groups.push(tmp);
                                    }
                                }
                            }
                        });
                        if (groups.length > 0) {
                            res[config] = {groups};
                        }
                    }
                }
                if (Object.keys(res).length === 0) {
                    res.empty = true;
                }
                self.searchResultStructure = res;
                app.navigate("#/manage/configurations/search/" + self.searchQuery);
            }
            else {
                self.searchResultStructure = {};
            }
        },
        redirectToConfig: function(config, section) {
            return section
                ? "#/manage/configurations/" + config + "#" + section + ""
                : "#/manage/configurations/" + config + "";
        },
        scrollToSection: function(id) {
            let element = document.getElementById(id);
            element.scrollIntoView({behavior: "smooth"});
        },
        clearSearch: function() {
            this.searchQuery = "";
            //this.searchResultStructure = {};
        }
    }
};
</script>
