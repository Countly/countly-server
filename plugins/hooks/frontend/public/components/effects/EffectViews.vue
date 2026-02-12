<template>
<div>
    <div class="section">
        <div class="cly-vue-hook-drawer-action-card">
            <div style="display:flex">
                <div class="is-action-card-title" style="flex-grow: 1;font-size:12px;">{{i18n('hooks.action')}}</div>
                <div class="is-action-card-title-right" v-if="$attrs.index > 0" @click="removeEffect($attrs.index)">{{i18n('hooks.remove-action')}}</div>
            </div>
            <validation-provider rules="required">
                <div class="cly-vue-drawer-step__section cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned">
                    <el-radio
                        class="is-autosized is-hook-effect-option"
                        v-model="value.type"
                        :label="item.value"
                        :key="idx"
                        v-for="(item, idx) in effectsOption"
                    border>
                        {{item.label}}
                        <div class="text-small">
                            {{item.description}}
                        </div>
                    </el-radio>
                </div>
            </validation-provider>

            <component
                :is="value.type"
                v-model="value.configuration"
            />
        </div>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import jQuery from 'jquery';
import EmailEffect from './EmailEffect.vue';
import CustomCodeEffect from './CustomCodeEffect.vue';
import HTTPEffect from './HTTPEffect.vue';

var EffectFactory = {
    options: [
        {label: jQuery.i18n.map["hooks.EmailEffect"], value: 'EmailEffect'},
        {label: jQuery.i18n.map["hooks.CustomCodeEffect"], value: 'CustomCodeEffect'},
        {label: jQuery.i18n.map["hooks.HTTPEffect"], value: 'HTTPEffect'},
    ]
};

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            selectedEffect: null,
            effectsOption: EffectFactory.options,
        };
    },
    computed: {
        effectType: function() {
            return this.value.type;
        }
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        effectType: function(newValue, oldValue) {
            if (!oldValue && this.value.configuration) { // edit record
                return;
            }
            switch (newValue) {
            case 'EmailEffect':
                this.value.configuration = {address: [], emailTemplate: ''};
                break;
            case 'CustomCodeEffect':
                this.value.configuration = {code: ''};
                break;
            case 'HTTPEffect':
                this.value.configuration = {url: '', method: '', requestData: ''};
                break;
            default:
                return;
            }
        },
    },
    components: {
        EmailEffect: EmailEffect,
        CustomCodeEffect: CustomCodeEffect,
        HTTPEffect: HTTPEffect,
    },
    methods: {
        removeEffect: function() {
            this.$emit('removeEffect', this.$attrs.index);
        },
    }
};
</script>
