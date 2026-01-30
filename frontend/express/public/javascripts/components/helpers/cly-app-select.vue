<template>
    <cly-select-x
        :options="options"
        :auto-commit="mode !== 'multi-check'"
        :mode="mode"
        :max-items="multipleLimit"
        v-bind="$attrs"
        v-on="$listeners">
        <template v-slot:option-prefix="option">
            <div v-if="showAppImage && dropdownApps[option.value] && dropdownApps[option.value].image"
                class="cly-vue-dropdown__dropdown-icon bu-mt-1 bu-mr-1"
                :style="{backgroundImage: 'url(' + dropdownApps[option.value].image + ')'}">
            </div>
        </template>
        <template v-if="showAppImage && selectedApps && dropdownApps[selectedApps]" v-slot:label-prefix>
            <div class="cly-vue-dropdown__dropdown-icon bu-ml-1 bu-mr-1"
                :style="{backgroundImage: 'url(' + dropdownApps[selectedApps].image + ')'}">
            </div>
        </template>
    </cly-select-x>
</template>

<script>
import countlyGlobal from '../../countly/countly.global.js';
import countlyCommon from '../../countly/countly.common.js';
import { validateCreate, validateRead, validateUpdate, validateDelete } from '../../countly/countly.auth.js';

export default {
    props: {
        allowAll: {
            type: Boolean,
            default: false,
            required: false
        },
        multiple: {
            type: Boolean,
            default: false,
            required: false
        },
        multipleLimit: {
            type: Number,
            default: 0,
            required: false
        },
        auth: {
            type: Object,
            default: function() {
                return {};
            },
            required: false
        },
        showAppImage: {
            type: Boolean,
            default: false,
            required: false
        }
    },
    computed: {
        options: function() {
            if (this.allowAll) {
                return [{ label: 'All apps', value: 'all' }].concat(this.apps);
            }
            return this.apps;
        },
        mode: function() {
            return this.multiple ? "multi-check" : "single-list";
        },
        selectedApps: function() {
            return this.$attrs.value;
        },
        apps: function() {
            var apps = countlyGlobal.apps || {};
            let formattedApps = [];
            var self = this;

            if (this.auth && this.auth.feature && this.auth.permission) {
                var expectedPermission = this.auth.permission,
                    targetFeature = this.auth.feature;

                var validateFn;
                switch (expectedPermission) {
                case 'c':
                    validateFn = validateCreate;
                    break;
                case 'r':
                    validateFn = validateRead;
                    break;
                case 'u':
                    validateFn = validateUpdate;
                    break;
                case 'd':
                    validateFn = validateDelete;
                    break;
                default:
                    validateFn = validateRead;
                }

                formattedApps = Object.keys(apps).reduce(function(acc, key) {
                    var currentApp = apps[key];

                    if (validateFn(targetFeature, null, currentApp._id)) {
                        acc.push({
                            label: currentApp.name,
                            value: currentApp._id
                        });
                    }
                    return acc;
                }, []);
            }
            else {
                formattedApps = Object.keys(apps).map(function(key) {
                    return {
                        label: countlyCommon.unescapeHtml(apps[key].name),
                        value: apps[key]._id
                    };
                });
            }

            return formattedApps.sort(function(a, b) {
                const aLabel = a?.label || '';
                const bLabel = b?.label || '';
                const locale = countlyCommon.BROWSER_LANG || 'en';

                if (aLabel && bLabel) {
                    return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
                }

                if (!aLabel && bLabel) {
                    return 1;
                }

                if (aLabel && !bLabel) {
                    return -1;
                }

                return 0;
            });
        }
    },
    data: function() {
        return {
            dropdownApps: countlyGlobal.apps || {}
        };
    }
};
</script>
